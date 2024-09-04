import {Router, json} from 'express';
import { PORT } from '../server-options';
import { PendingDebugInfo, PendingOperationRequest, PendingOperations, PendingPropertyUpdates, PendingRestart, PendingUpdates } from '../services/agent-state';
import { MakeAsyncSafe } from '../utils/async';
import * as uuid from 'uuid';

let nextOperationId = 1;

export function CreateHeartbeatRouter(services: Services) {
  const router = MakeAsyncSafe(Router());

  router.post("/", json({limit: '80MB'}), async (req, res) => {
    //console.log(`AgentManifestHash: '${req.body.agentInfo.agentManifestHash}'`)
    const id = req.body.agentInfo.identifier ?? null;
    const class_name = req.body.agentInfo.agentClass ?? null;
    const flow = req.body.flowInfo?.flowId ?? null;

    const update = PendingUpdates.get(id);
    if (update) {
      PendingUpdates.delete(id);
      console.log(`Updating ${id}`);
      let file_count = update.files.length;
      const resolve = () => {
        if (--file_count == 0) {
          update.resolve();
        }
      }
      const reject = (reason?: string) => {
        update.reject(reason);
      }
      const operations = [];
      for (const file of update.files) {
        const id = `${nextOperationId++}`;
        PendingOperations.set(id, {resolve, reject});
        operations.push({
          operationId: id,
          operation: "update",
          name: "asset",
          args: {
            file: file.name,
            url: file.url
          }
        })
      }
      return res.json({requestedOperations: operations})
    }

    const restart_cmd = PendingRestart.get(id);
    if (restart_cmd) {
      PendingRestart.delete(id);
      console.log(`Restarting ${id}`);
      const opId = `${nextOperationId++}`;
      PendingOperations.set(opId, restart_cmd);
      return res.json({requestedOperations: [{
        operationId: opId,
        operation: "restart"
      }]});
    }

    const cb = PendingDebugInfo.get(id);
    PendingDebugInfo.delete(id);
    if (cb) {
      const file_name = `debug.${uuid.v4()}.tar.gz`;
      const opId = `${nextOperationId++}`;
      PendingOperations.set(opId, {
        resolve: () => cb.resolve(file_name),
        reject: cb.reject
      });
      return res.json({requestedOperations: [{
        operationId: opId,
        operation: "transfer",
        name: "debug",
        args: {
          target: `/api/file/${file_name}`
        }
      }]})
    }

    const configure = PendingPropertyUpdates.get(id);
    PendingPropertyUpdates.delete(id);
    if (configure) {
      const opId = `${nextOperationId++}`;
      PendingOperations.set(opId, configure.cb);
      const args: {[name: string]: {value: string, persist: boolean}} = {};
      for (const prop of configure.properties) {
        args[prop.name] = {value: prop.value, persist: prop.persist};
      }
      return res.json({requestedOperations: [{
        operationId: opId,
        operation: "update",
        name: "properties",
        args
      }]})
    }

    const op = PendingOperationRequest.get(id);
    if (op) {
      const opId = `${nextOperationId++}`;
      PendingOperationRequest.delete(id);
      console.log(`Issuing request for ${id}`);
      PendingOperations.set(opId, op);
      return res.json({requestedOperations: [{
        operationId: opId, ...op.request
      }]})
    }

    const manifest: AgentManifest|null = transformManifest(req.body.agentInfo?.agentManifest ?? null);
    if (manifest) {
      manifest.raw = req.body;
    }
    if (req.body.agentInfo?.agentManifestHash && manifest) {
      manifest.hash = req.body.agentInfo.agentManifestHash;
    }
    if (typeof id !== "string") {
      throw new Error(`Invalid agent identifier: ${id}`);
    }
    if (class_name !== null && typeof class_name !== "string") {
      throw new Error(`Invalid agent class: ${class_name}`);
    }
    if (flow !== null && typeof flow !== "string") {
      throw new Error(`Invalid agent flow: ${flow}`);
    }
    const target_flow = await services.agentService.heartbeat({id, flow, class: class_name, manifest: manifest ? stableStringify(manifest) : null});
    if (target_flow !== null && target_flow !== flow) {
      console.log(`Sending flow update request, expected flow: ${target_flow}, actual: ${flow}`);
      return res.json({requestedOperations: [
        {
          identifier: `${nextOperationId++}`,
          operation: "UPDATE",
          operand: "configuration",
          args: {
            flowId: target_flow,
            persist: "true",
            location: `/${target_flow}`
          }
        }
      ]})
    }
    res.json({requestedOperations: []});
  })

  return router;
}

interface HeartbeatAgentManifest {
  bundles?: {
    artifact: string
    componentManifest: {
      processors?: ProcessorManifest[]
      controllerServices?: ControllerServiceManifest[]
    }
  }[]
  schedulingDefaults?: SchedulingDefaults,
  supportedOperations?: HeartbeatOperation[]
}

interface HeartbeatOperation {
  type: string,
  properties?: {[name: string]: any}
}

const defaultNames = [
  'defaultMaxConcurrentTasks',
  'defaultRunDurationNanos',
  'defaultSchedulingPeriodMillis',
  'defaultSchedulingStrategy',
  'penalizationPeriodMillis',
  'yieldDurationMillis'] as const;

function transformManifest(manifest: HeartbeatAgentManifest|null): AgentManifest|null {
  if (!manifest) return null;
  const result: AgentManifest = {processors: [], controllerServices: [], schedulingDefaults: {}, properties: {}};
  if (manifest.bundles) {
    const processed_artifacts = new Set<string>();
    for (const bundle of manifest.bundles) {
      if (processed_artifacts.has(bundle.artifact)) continue;
      processed_artifacts.add(bundle.artifact);
      result.processors.push(...(bundle.componentManifest?.processors ?? []));
      result.controllerServices.push(...(bundle.componentManifest?.controllerServices ?? []));
    }
  }
  if (manifest.schedulingDefaults) {
    for (const key of defaultNames) {
      result.schedulingDefaults[key] = manifest.schedulingDefaults[key] as any;
    }
  }
  if (manifest.supportedOperations) {
    for (const op of manifest.supportedOperations) {
      if (op.type === "update") {
        for (const prop of op.properties!.properties.availableProperties) {
          result.properties[prop.propertyName] = prop.propertyValue ?? null;
        }
      }
    }
  }
  return result;
}

function stableStringify(data: any): string {
  if (typeof data !== 'object' || data === null) return JSON.stringify(data);
  if (data instanceof Array) {
    let result = "[";
    let first = true;
    for (const item of data) {
      if (!first) result += ',';
      first = false;
      result += stableStringify(item);
    }
    result += "]";
    return result;
  }
  const keys = Object.keys(data).sort();
  let result = "{";
  let first = true;
  for (const key of keys) {
    if (!first) result += ',';
    first = false;
    result += JSON.stringify(key) + ":" + stableStringify(data[key]);
  }
  result += "}";
  return result;
}