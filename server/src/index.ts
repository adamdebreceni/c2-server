/// <reference path="index.d.ts" />
import * as express from 'express';
import {Request, Response, NextFunction} from 'express'; 
import { CreateApiRoute } from './api';
import { CreateFileRouter } from './api/file';
import { CreateDatabase } from './database';
import { PORT as DEFAULT_PORT } from './server-options';
import { CreateServices } from './services';
import { MakeAsyncSafe } from './utils/async';
import * as zlib from 'zlib';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const db = await CreateDatabase();
  const services = await CreateServices(db);
  
  const app = MakeAsyncSafe(express());

  app.use(function(req, res, next) {
    console.log(`Received request, size: ${req.headers['content-length']} B`);
    res.setHeader("Accept-Encoding", "gzip");
    next();
    // if (req.headers['content-encoding'] !== 'gzip') {
    //   console.log(`Request type: RAW`);
    //   next();
    //   return;
    // }
    // delete req.headers['content-encoding'];
    // console.log(`Request type: GZIP`);
    // let data: Buffer[] = [];
    // req.addListener("data", (chunk) => {
    //   console.log(`Received chunk`);
    //   data.push(chunk);
    // });

    // req.addListener("end", () => {
    //   console.log(`Unzipping`);
    //   zlib.gunzip(Buffer.concat(data), (err, buffer) => {
    //     if (!err) {
    //       console.log(`Unzip successful`);
    //       req.body = buffer;
    //       next();
    //     } else {
    //       console.log(`Unzip failed: `, err);
    //       next(err);
    //     }
    //   });
    // });
  });
  
  app.use("/api", CreateApiRoute(services));

  const STATIC_DIR = path.join(__dirname, '../../website/build');

  app.get('/:filename', (req, res) => {
    if (fs.existsSync(path.join(STATIC_DIR, req.params.filename))) {
      res.sendFile(path.join(STATIC_DIR, req.params.filename));
    } else {
      res.sendFile(path.join(STATIC_DIR, 'index.html'));
    }
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(STATIC_DIR, '/index.html'));
  });

  app.use((err: any, req: Request, res: Response, next: NextFunction)=>{
    debugger;
  })

  const PORT = (()=>{
    const args = process.argv.slice(2);
    let port_idx = args.indexOf("-p");
    if (port_idx === -1) port_idx = args.indexOf("--port");
    if (port_idx !== -1) {
      return parseInt(args[port_idx + 1]);
    }
    return DEFAULT_PORT;
  })();
  
  app.listen(PORT, ()=>{
    console.log(`Server started on port ${PORT}`);
  })
}

main();