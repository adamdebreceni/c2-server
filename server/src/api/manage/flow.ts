import { json, raw, Router } from "express";
import { MakeAsyncSafe } from "../../utils/async";
import {DeserializeJsonToFlow} from "../../utils/json-flow-serializer";

export function CreateManageFlowRouter(services: Services): Router {
  const router = MakeAsyncSafe(Router());

  router.get("/:id", async (req, res)=>{
    const flow = await services.flowService.get(req.params.id);
    if (flow === null) {
      res.json(null);
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.send(flow);
  })

  router.get("/", async (req, res)=>{
    const flows = await services.flowService.listAll();
    res.json(flows);
  })

  router.post("/publish", json(), async (req, res)=>{
    const flowId = req.body.flowId;
    if (typeof flowId !== "string") throw new Error("Invalid request");
    const classes = req.body.classes;
    if (!(classes instanceof Array) || classes.some(clazz => typeof clazz !== "string")) throw new Error("Invalid request");
    const agents = req.body.agents;
    if (!(agents instanceof Array) || agents.some(agent => typeof agent !== "string")) throw new Error("Invalid request");
    await services.flowService.serialize(flowId);
    await services.agentService.publish(classes, agents, flowId);
    res.end();
  })

  router.post("/import", json(), async(req, res) => {
    console.log("Importing...");
    const class_name = req.body.class_name;
    if (typeof class_name !== "string") throw new Error("Missing class");
    let class_manifest = await services.agentService.fetchManifestForClass(class_name);
    if (class_manifest === null) throw new Error("Missing class manifest");

    const flow_str = req.body.flow;
    if (typeof flow_str !== "string") throw new Error("Missing flow");

    console.log("Deserializing...");
    const flow_object = DeserializeJsonToFlow(flow_str, JSON.parse(class_manifest));
    if (flow_object === null) {
      console.log("Import failed");
      res.status(400);
      res.end();
      return;
    }
    const id = await services.flowService.save(Buffer.from(JSON.stringify(flow_object)));
    console.log(`Imported as ${id}`);
    res.end();
  })

  router.post("/serialize", json(), async(req, res) => {
    const flowId = req.body.flowId;
    if (typeof flowId !== "string") throw new Error("Invalid request");
    await services.flowService.serialize(flowId);
    res.end();
  })

  router.post("/create", json(), async (req, res)=>{
    if ('agent' in req.body && typeof req.body.agent === "string") {
      const manifest = await services.agentService.fetchManifestForAgent(req.body.agent);
      if (manifest === null) throw new Error(`No manifest for agent ${req.body.agent}`);
      const flow = services.flowService.createDefaultFlowObject(JSON.parse(manifest));
      const id = await services.flowService.save(Buffer.from(JSON.stringify(flow)));
      res.json(id);
      return;
    }
    if ('class' in req.body && typeof req.body.class === "string") {
      const manifest = await services.agentService.fetchManifestForClass(req.body.class);
      if (manifest === null) throw new Error(`No manifest for agent class "${req.body.class}"`);
      const flow = services.flowService.createDefaultFlowObject(JSON.parse(manifest));
      const id = await services.flowService.save(Buffer.from(JSON.stringify(flow)));
      res.json(id);
      return;
    }
    throw new Error("Invalid request format");
  })

  router.patch("/:id", json({limit: "80 MB"}), async (req, res)=>{
    const id = await services.flowService.save(Buffer.from(JSON.stringify(req.body)), req.params.id);
    res.json(id);
  })

  return router;
}