import { Router } from "express";
import { MakeAsyncSafe } from "../../utils/async";

export function CreateManageAgentClassRouter(services: Services): Router {
  const router = MakeAsyncSafe(Router());

  router.get("/", async (req, res)=>{
    const agents = await services.agentService.fetchClasses()
    res.json(agents);
  })

  router.get("/manifest/:name", async (req, res)=>{
    const manifest = await services.agentService.fetchManifestForClass(req.params.name)
    res.setHeader("Content-Type", "application/json");
    res.send(manifest ?? 'null');
  })

  return router;
}