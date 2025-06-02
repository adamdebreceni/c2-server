import { FLOW_DIR, SERIALIZED_FLOW_DIR } from "./initialize";
import * as fs from 'fs';
import * as path from 'path';
import * as uuid from 'uuid';
import * as sqlite from "sqlite3";

export class FlowDatabase {
  constructor(private db: sqlite.Database) {}
  async getSerialized(id: FlowId): Promise<Buffer|null> {
    if (!id.match(/^[0-9a-zA-Z_-]+$/)) {
      return null;
    }
    return new Promise<Buffer|null>((resolve, reject)=>{
      fs.readFile(path.join(SERIALIZED_FLOW_DIR, id), (err, data)=>{
        if (err) {
          console.error(`Error while reading serialized flow "${id}": `, err);
          resolve(null);
        } else {
          resolve(data);
        }
      })
    });
  }

  async listAll(): Promise<FlowLike[]> {
    const flows: FlowLike[] = [];
    for (const file of fs.readdirSync(FLOW_DIR)) {
      const stat = fs.statSync(path.join(FLOW_DIR, file));
      if (stat.isDirectory()) continue;
      const flow = JSON.parse(fs.readFileSync(path.join(FLOW_DIR, file)).toString('utf8'));
      if (fs.existsSync(path.join(SERIALIZED_FLOW_DIR, file))) {
        flows.push({id: file, parent: flow.parent ?? null, className: flow.className, status: "published", publishedOn: stat.mtime});
      } else {
        flows.push({id: file, parent: flow.parent ?? null, className: flow.className, status: "editing", modified: stat.mtime});
      }
    }
    function getTime(f: FlowLike) {
      if (f.status === "editing") return f.modified;
      return f.publishedOn;
    }
    return flows.sort((a, b) => getTime(b).valueOf() - getTime(a).valueOf());
  }

  async get(id: FlowId): Promise<Buffer|null> {
    if (!id.match(/^[0-9a-zA-Z_-]+$/)) {
      return null;
    }
    return new Promise<Buffer|null>((resolve, reject)=>{
      fs.readFile(path.join(FLOW_DIR, id), (err, data)=>{
        if (err) {
          console.error(`Error while reading flow "${id}": `, err);
          resolve(null);
        } else {
          resolve(data);
        }
      })
    });
  }

  async save(flow: FlowObject, id?: FlowId): Promise<FlowId> {
    if (id && !id.match(/^[0-9a-zA-Z_-]+$/)) {
      throw new Error(`Invalid flow id: ${id}`);
    }
    if (id && fs.existsSync(path.join(SERIALIZED_FLOW_DIR, id))) {
      flow.parent = id;
    } else if (id && fs.existsSync(path.join(FLOW_DIR, id))) {
      const prev_version = JSON.parse(fs.readFileSync(path.join(FLOW_DIR, id)).toString('utf8'));
      flow.parent = prev_version.parent;
    }
    const flow_id = (!id || fs.existsSync(path.join(SERIALIZED_FLOW_DIR, id))) ? uuid.v4() : id;
    return new Promise((resolve, reject)=>{
      fs.writeFile(path.join(FLOW_DIR, flow_id), Buffer.from(JSON.stringify(flow)), {}, (err)=>{
        if (!err) {
          resolve(flow_id);
        } else {
          console.error(`Failed to write flow id: "${flow_id}"`, err);
          reject(err);
        }
      })
    })
  }

  async serialize(id: FlowId, serializer: (data: Buffer)=>Buffer): Promise<void> {
    if (id && !id.match(/^[0-9a-zA-Z_-]+$/)) {
      throw new Error(`Invalid flow id: ${id}`);
    }
    if (fs.existsSync(path.join(SERIALIZED_FLOW_DIR, id))) {
      throw new Error(`Flow is already serialized id: "${id}"`);
    }
    const flow = await new Promise<Buffer|null>((resolve, reject)=>{
      fs.readFile(path.join(FLOW_DIR, id), (err, data)=>{
        if (err) {
          console.error(`Error while reading flow "${id}": `, err);
          resolve(null);
        } else {
          resolve(data);
        }
      })
    });
    if (!flow) {
      throw new Error(`Didn't find flow with id "${id}" to serialize`);
    }
    const serialized = serializer(flow);
    return new Promise((resolve, reject)=>{
      fs.writeFile(path.join(SERIALIZED_FLOW_DIR, id), serialized, {}, (err)=>{
        if (!err) {
          resolve();
        } else {
          console.error(`Failed to write flow id: "${id}"`, err);
          reject(err);
        }
      })
    })
  }
}