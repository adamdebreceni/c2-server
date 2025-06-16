import {raw, Router} from 'express';
import { MakeAsyncSafe } from '../utils/async';
import * as path from 'path'
import * as multer from 'multer';
import * as fs from 'fs'
import * as crc32 from 'crc-32';
import * as uuid from 'uuid';

export function CreateFileRouter(services: Services) {
  const router = MakeAsyncSafe(Router());

  router.get("/:id", async (req, res)=>{
    console.log(`Reading file "${req.params.id}"`);
    res.sendFile(path.join(process.cwd(), ".data/files", req.params.id));
  });

  router.post("/", multer().any(), async (req, res)=>{
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Origin", "*")
    if (!req.files || req.files.length === 0) {
      throw new Error("Missing files");
    }
    console.log(`Writing files`);
    try {
      fs.mkdirSync(path.join(process.cwd(), ".data/files/"), {});
    } catch (e) {}
    const response: string[] = [];
    for (const file of (req.files as any)) {
      const id = uuid.v4();
      fs.writeFileSync(path.join(process.cwd(), ".data/files", id), file.buffer);
      response.push(id);
      // res.json(crc32.buf(file.buffer).toString(16));
    }
    res.send(response);
  })

  router.options("/", async (req, res)=>{
    console.log("Options checking");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.end();
  })

  return router;
}