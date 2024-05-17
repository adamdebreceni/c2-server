import {Router} from 'express';
import { MakeAsyncSafe } from '../utils/async';

export function CreateFlowRouter(services: Services) {
  const router = MakeAsyncSafe(Router());

  router.get("/:flowId", async (req, res)=>{
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

  return router;
}