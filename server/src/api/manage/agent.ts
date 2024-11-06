import { json, raw, Router, text } from "express";
import { PendingComponentRun, PendingComponentStart, PendingComponentStateClear, PendingComponentStateQuery, PendingComponentStop, PendingDebugInfo, PendingOperationRequest, PendingPropertyUpdates, PendingRestart, PendingUpdates } from "../../services/agent-state";
import { MakeAsyncSafe } from "../../utils/async";

export function CreateManageAgentRouter(services: Services): Router {
  const router = MakeAsyncSafe(Router());

  router.get("/", async (req, res)=>{
    const agents = await services.agentService.fetch()
    res.json(agents);
  })

  router.get("/:id", async (req, res)=>{
    const agent = await services.agentService.fetchAgent(req.params.id);
    res.json(agent);
  })

  router.get("/manifest/:id", async (req, res)=>{
    const manifest = await services.agentService.fetchManifestForAgent(req.params.id)
    res.setHeader("Content-Type", "application/json");
    res.send(manifest ?? 'null');
  })

  router.get("/:id/componentstate", async (req, res)=>{
    console.log(`Scheduling component state query for ${req.params.id}`);
    let resolve: (state: string)=>void = null as any;
    let reject: (reason?: string)=>void = null as any;
    const result = new Promise<string>((res, rej)=>{
      resolve = res;
      reject = rej;
    })
    PendingComponentStateQuery.set(req.params.id, {
      resolve,
      reject
    });
    res.json(JSON.parse(await result)["corecomponentstate"]);
  })

  router.delete("/:agentId/componentstate", json(), async (req, res)=>{
    for (const id of req.body) {
      if (typeof id !== "string") {
        throw `Component id is not a string got ${typeof id}`;
      }
    }
    console.log(`Clearing component state on agent ${req.params.agentId} for components [${req.body.join(', ')}]`);
    let resolve: ()=>void = null as any;
    let reject: (reason?: string)=>void = null as any;
    const result = new Promise<void>((res, rej)=>{
      resolve = res;
      reject = rej;
    })
    PendingComponentStateClear.set(req.params.agentId, {
      components: req.body,
      resolve,
      reject
    });
    await result;
    res.sendStatus(200);
  })

  router.post("/update", json(), async (req, res) => {
    console.log(`Scheduling update for ${req.body.id}`);
    let resolve: ()=>void = null as any;
    let reject: (reason?: string)=>void = null as any;
    const result = new Promise<void>((res, rej)=>{
      resolve = res;
      reject = rej;
    })
    PendingUpdates.set(req.body.id, {
      files: req.body.files,
      resolve,
      reject
    });
    await result;
    res.sendStatus(200);
  })

  router.post("/:agentId/stop-component/:componentId", async (req, res) => {
    let resolve: ()=>void = null as any;
    let reject: ()=>void = null as any;
    const result = new Promise<void>((res, rej)=>{
      resolve = res;
      reject = rej;
    })
    console.log(`STOP requested`);
    PendingComponentStop.set(req.params.agentId, {id: req.params.componentId, resolve, reject});
    await result;
    res.sendStatus(200);
  })

  router.post("/:agentId/start-component/:componentId", async (req, res) => {
    let resolve: ()=>void = null as any;
    let reject: ()=>void = null as any;
    const result = new Promise<void>((res, rej)=>{
      resolve = res;
      reject = rej;
    })
    PendingComponentStart.set(req.params.agentId, {id: req.params.componentId, resolve, reject});
    await result;
    res.sendStatus(200);
  })

  router.post("/:agentId/run-component/:componentId", json(), async (req, res) => {
    let resolve: (result: string)=>void = null as any;
    let reject: ()=>void = null as any;
    const result = new Promise<string>((res, rej)=>{
      resolve = res;
      reject = rej;
    })
    PendingComponentRun.set(req.params.agentId, {id: req.params.componentId, input: req.body, resolve, reject});
    const run_result: RunResult = JSON.parse(await result) as any;
    const processed_result: RunResult = {'results': run_result['results']};
    if (run_result.schedule_error !== undefined) {
      processed_result.schedule_error = run_result.schedule_error;
    }
    if (run_result.trigger_error !== undefined) {
      processed_result.trigger_error = run_result.trigger_error;
    }
    res.json(processed_result);
  })

  router.post("/:agentId/config", json(), async (req, res) => {
    await services.agentService.saveConfig(req.params.agentId, JSON.stringify(req.body));
    res.sendStatus(200);
  })

  router.post("/restart/:id", async (req, res) => {
    let resolve: ()=>void = null as any;
    let reject: ()=>void = null as any;
    const result = new Promise<void>((res, rej)=>{
      resolve = res;
      reject = rej;
    })
    PendingRestart.set(req.params.id, {resolve, reject});
    await result;
    res.sendStatus(200);
  })

  router.post("/debug/:id", async (req, res)=>{
    console.log(`Requesting debug information for "${req.params.id}"`)
    let reject: ()=>void = null as any;
    let resolve: (file: string)=>void = null as any;
    const done = new Promise<string>((res, rej)=>{
      resolve = res;
      reject = rej;
    })
    PendingDebugInfo.set(req.params.id, {resolve, reject});
    res.json({file: await done});
  })

  router.post("/configure/:id", json(), async (req, res) => {
    if (!(req.body instanceof Array)) {
      throw new Error("Malformed input: expected an array");
    }
    for (const item of req.body) {
      if (typeof item.name !== "string") {
        throw new Error("Malformed input: property name is not a string");
      }
      if (typeof item.value !== "string") {
        throw new Error("Malformed input: property value is not a string");
      }
      if (typeof item.persist !== "boolean") {
        throw new Error("Malformed input: property persist is not a bool");
      }
    }
    let resolve: ()=>void = null as any;
    let reject: ()=>void = null as any;
    const result = new Promise<void>((res, rej)=>{
      resolve = res;
      reject = rej;
    })
    PendingPropertyUpdates.set(req.params.id, {properties: req.body, cb: {resolve, reject}});
    await result;
    res.sendStatus(200);
  })

  router.post("/:id", json(), async (req, res)=>{
    const agentId = req.params.id;
    const request = req.body;
    if (!(request instanceof Object)) {
      return res.json({error: "Request is not an object"});
    }
    console.log(`Scheduling operation for ${agentId}`);
    let resolve: (answer?: string)=>void = null as any;
    let reject: (reason?: string)=>void = null as any;
    const result = new Promise<string|undefined>((res, rej)=>{
      resolve = res;
      reject = rej;
    })
    PendingOperationRequest.set(agentId, {
      request: req.body,
      resolve,
      reject
    });
    const data = await result;
    console.log(`Sending response to request ${agentId}`);
    res.send(data);
  })

  return router;
}