import { Router } from 'express';
import { MakeAsyncSafe } from '../utils/async';
import { CreateAcknowledgeRouter } from './acknowledge';
import { CreateAlertRouter } from './alert';
import { CreateFlowRouter } from './flow';
import { CreateHeartbeatRouter } from './heartbeat';
import { CreateManageRouter } from './manage';
import { CreateFileRouter } from './file';

export function CreateApiRoute(services: Services) {
  const router = MakeAsyncSafe(Router());

  router.use("/heartbeat", CreateHeartbeatRouter(services));
  router.use("/acknowledge", CreateAcknowledgeRouter(services));
  router.use("/flows", CreateFlowRouter(services));
  router.use("/alert", CreateAlertRouter(services));

  router.use("/manage", CreateManageRouter(services));
  router.use("/file", CreateFileRouter(services))

  return router;
}