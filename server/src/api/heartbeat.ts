import {Router, json} from 'express';
import { PORT } from '../server-options';
import { PendingComponentRun, PendingComponentStart, PendingComponentStateClear, PendingComponentStateQuery, PendingComponentStop, PendingDebugInfo, PendingOperationRequest, PendingOperations, PendingPropertyUpdates, PendingRestart, PendingUpdates } from '../services/agent-state';
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
    let device_info_str = null;
    let agent_info_str = null;
    if (req.body.deviceInfo) {
      device_info_str = JSON.stringify(req.body.deviceInfo);
    }
    if (req.body.agentInfo) {
      agent_info_str = JSON.stringify(req.body.agentInfo);
    }

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
      res.json({requestedOperations: operations});
      return;
    }

    const restart_cmd = PendingRestart.get(id);
    if (restart_cmd) {
      PendingRestart.delete(id);
      console.log(`Restarting ${id}`);
      const opId = `${nextOperationId++}`;
      PendingOperations.set(opId, restart_cmd);
      res.json({requestedOperations: [{
        operationId: opId,
        operation: "restart"
      }]});
      return;
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
      res.json({requestedOperations: [{
        operationId: opId,
        operation: "transfer",
        name: "debug",
        args: {
          target: `/api/file/${file_name}`
        }
      }]});
      return;
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
      res.json({requestedOperations: [{
        operationId: opId,
        operation: "update",
        name: "properties",
        args
      }]});
      return;
    }

    const op = PendingOperationRequest.get(id);
    if (op) {
      const opId = `${nextOperationId++}`;
      PendingOperationRequest.delete(id);
      console.log(`Issuing request for ${id}`);
      PendingOperations.set(opId, op);
      res.json({requestedOperations: [{
        operationId: opId, ...op.request
      }]});
      return;
    }

    const component_stop = PendingComponentStop.get(id);
    PendingComponentStop.delete(id);
    if (component_stop) {
      const opId = `${nextOperationId++}`;
      PendingOperations.set(opId, component_stop);
      res.json({requestedOperations: [{
        operationId: opId,
        operation: "stop",
        name: component_stop.id,
        args: {}
      }]});
      return;
    }

    const component_start = PendingComponentStart.get(id);
    PendingComponentStart.delete(id);
    if (component_start) {
      const opId = `${nextOperationId++}`;
      PendingOperations.set(opId, component_start);
      res.json({requestedOperations: [{
        operationId: opId,
        operation: "start",
        name: component_start.id,
        args: {}
      }]});
      return;
    }

    const component_state_query = PendingComponentStateQuery.get(id);
    PendingComponentStateQuery.delete(id);
    if (component_state_query) {
      const opId = `${nextOperationId++}`;
      PendingOperations.set(opId, component_state_query);
      res.json({requestedOperations: [{
        operationId: opId,
        operation: "DESCRIBE",
        name: "corecomponentstate",
        args: {}
      }]});
      return;
    }

    const component_state_clear = PendingComponentStateClear.get(id);
    PendingComponentStateClear.delete(id);
    if (component_state_clear) {
      const opId = `${nextOperationId++}`;
      PendingOperations.set(opId, component_state_clear);
      res.json({requestedOperations: [{
        operationId: opId,
        operation: "clear",
        name: "corecomponentstate",
        args: {...component_state_clear.components}
      }]});
      return;
    }

    const component_run = PendingComponentRun.get(id);
    PendingComponentRun.delete(id);
    if (component_run) {
      const opId = `${nextOperationId++}`;
      PendingOperations.set(opId, component_run);
      res.json({requestedOperations: [{
        operationId: opId,
        operation: "trigger",
        name: component_run.id,
        args: component_run.input
      }]});
      return;
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
    let flow_info_str = null;
    if (req.body.flowInfo) {
      flow_info_str = JSON.stringify(req.body.flowInfo);
    }

    if (req.body.flowInfo?.processorBulletins) {
      await services.agentService.pushBulletins(id, (req.body.flowInfo?.processorBulletins as ProcessorBulletin[]).map(bulletin => ({...bulletin, timestamp: new Date(bulletin.timestamp as any)})));
    }

    const hb_result = await services.agentService.heartbeat({id, flow, class: class_name, manifest: manifest ? stableStringify(manifest) : null, flow_info: flow_info_str, device_info: device_info_str, agent_info: agent_info_str});
    const target_flow = hb_result.flow;
    const agent_manifest = hb_result.manifest;
    if (target_flow !== null && target_flow !== flow) {
      console.log(`Sending flow update request, expected flow: ${target_flow}, actual: ${flow}`);
      const opId = `${nextOperationId++}`;
      PendingOperations.set(opId, {resolve: ()=>{}, reject: (reason: any) => {
        services.agentService.saveFlowUpdateFailure(id, target_flow, reason);
        // agentId: id, flowId: target_flow
      }});
      res.json({requestedOperations: [
        {
          identifier: opId,
          operation: "UPDATE",
          operand: "configuration",
          args: {
            flowId: target_flow,
            persist: "true",
            location: `/${target_flow}`,
            relativeFlowUrl: `/flows/${target_flow}`
          }
        }
      ]});
      return;
    }
    if (agent_manifest === null) {
      console.log(`Requesting manifest from ${id}`)
      const opId = `${nextOperationId++}`;
      let resolve: (data?: any)=>void = null as any;
      let reject: (reason?: string)=>void = null as any;
      new Promise<string>((res, rej) => {
        resolve = res;
        reject = rej;
      }).then((resp_str: string) => {
        const response = JSON.parse(resp_str);
        const id = response.agentInfo.identifier;
        const class_name = response.agentInfo.agentClass;
        const manifest: AgentManifest|null = transformManifest(response.agentInfo.agentManifest);
        if (manifest) {
          manifest.raw = response;
        }
        if (response.agentInfo.agentManifestHash && manifest) {
          manifest.hash = response.agentInfo.agentManifestHash;
        }
        return services.agentService.heartbeat({id, flow: null, class: class_name, manifest: manifest ? stableStringify(manifest) : null, flow_info: null, device_info: null, agent_info: null});
      })
      PendingOperations.set(opId, {resolve, reject});
      res.json({requestedOperations: [
        {
          identifier: opId,
          operation: "DESCRIBE",
          operand: "manifest",
          args: {}
        }
      ]});
      return;
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