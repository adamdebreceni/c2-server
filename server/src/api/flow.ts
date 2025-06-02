import { Router } from 'express';
import { MakeAsyncSafe } from '../utils/async';
import { DeserializeJsonToFlow, SerializeFlowToJson } from '../utils/json-flow-serializer'

export function CreateFlowRouter(services: Services) {
  const router = MakeAsyncSafe(Router());

  router.get("/:flowId", async (req, res) => {
    const flow_content = await services.flowService.getSerialized(req.params.flowId);
    if (!flow_content) {
      console.error(`Couldn't find flow '${req.params.flowId}'`)
      res.sendStatus(404);
    } else {
      console.log(`Serving flow: ${req.params.flowId}`)
      res.setHeader("Content-Type", "application/json");
      res.send(flow_content);
    }
  });

  router.get("/deserialize_test/:flowId", async (req, res) => {
    const flow_content = await services.flowService.getSerialized(req.params.flowId);
    const test_class_name = "my_class_cpp_localhost";
    let agent_manifest = await services.agentService.fetchManifestForClass(test_class_name);
    if (flow_content === null) throw new Error("NO FLOW CONTENT");
    if (agent_manifest === null) throw new Error("NO AGENT MANIFEST");

    const flow_object = DeserializeJsonToFlow(flow_content.toString(), test_class_name, JSON.parse(agent_manifest));
    if (flow_object === null) {
      throw new Error("NO FLOW CONTENT");
    }
    const flow_reserialized = SerializeFlowToJson(req.params.flowId, flow_object);
    res.setHeader("Content-Type", "application/json");
    res.send(flow_reserialized);
  });

  return router;
}