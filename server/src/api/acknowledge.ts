import {json, Router} from 'express';
import { PendingOperations } from '../services/agent-state';
import { MakeAsyncSafe } from '../utils/async';

export function CreateAcknowledgeRouter(services: Services) {
  const router = MakeAsyncSafe(Router());

  router.post("/", json({limit: '80MB'}), (req, res)=>{
    const raw_body = JSON.stringify(req.body);
    console.log(`Acknowledge size: ${raw_body.length} B`);
    
    const opId = req.body.operationId;
    const state = req.body.operationState.state;
    console.log(`Acknowledge operation {id: ${opId}, state: ${state}}`);
    const cb = PendingOperations.get(opId);
    PendingOperations.delete(opId);
    if (state === "FULLY_APPLIED" || state === "NO_OPERATION") {
      cb?.resolve(raw_body);
    } else {
      cb?.reject(req?.body?.operationState?.details);
    }

    res.end();
  })

  return router;
}