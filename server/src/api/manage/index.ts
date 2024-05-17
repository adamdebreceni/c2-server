import { Router } from "express";
import { MakeAsyncSafe } from "../../utils/async";
import { CreateManageAgentRouter } from "./agent";
import { CreateManageAgentClassRouter } from "./class";
import { CreateManageFlowRouter } from "./flow";

export function CreateManageRouter(services: Services): Router {
  const router = MakeAsyncSafe(Router());

  router.use("/flow", CreateManageFlowRouter(services));
  router.use("/agent", CreateManageAgentRouter(services));
  router.use("/class", CreateManageAgentClassRouter(services));

  return router;
}