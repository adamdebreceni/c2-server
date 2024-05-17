import {raw, Router} from 'express';
import { MakeAsyncSafe } from '../utils/async';
import * as path from 'path'

export function CreateSecretRouter(services: Services) {
  const router = MakeAsyncSafe(Router());

  router.post("/", raw({type: "*/*"}), async (req, res)=>{
    const data: Buffer = req.body;
    console.log(`Got secret: ${data}`);
    res.end();
  });

  return router;
}