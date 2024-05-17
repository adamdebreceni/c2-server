import {raw, Router} from 'express';
import { MakeAsyncSafe } from '../utils/async';
import * as path from 'path'
import * as multer from 'multer';
import * as fs from 'fs'
import * as crc32 from 'crc-32';

export function CreateFileRouter(services: Services) {
  const router = MakeAsyncSafe(Router());

  router.get("/:fileName", async (req, res)=>{
    console.log(`Reading file "${req.params.fileName}"`);
    res.sendFile(path.join(process.cwd(), ".data/files", req.params.fileName));
  });

  router.post("/:fileName", multer().any(), async (req, res)=>{
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Origin", "*")
    if (!req.files || req.files.length === 0) {
      throw new Error("Missing files");
    }
    console.log(`Writing files`);
    try {
      fs.mkdirSync(path.join(process.cwd(), ".data/files/"), {});
    } catch (e) {}
    const response: any = {};
    for (const file of (req.files as any)) {
      fs.writeFileSync(path.join(process.cwd(), ".data/files", req.params.fileName), file.buffer);
      // res.json(crc32.buf(file.buffer).toString(16));
    }
    res.end();
  })

  router.options("/:fileName", async (req, res)=>{
    console.log("Options checking");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.end();
  })

  return router;
}