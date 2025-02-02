import { Database } from "sqlite3";
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "state.db");
export const FLOW_DIR = path.join(DATA_DIR, ".flows");
export const SERIALIZED_FLOW_DIR = path.join(DATA_DIR, "flows");

export async function initialize(): Promise<Database> {
  await createDirectory(DATA_DIR);
  await createDirectory(FLOW_DIR);
  await createDirectory(SERIALIZED_FLOW_DIR);
  if (fs.existsSync(DB_FILE)) {
    return new Database(DB_FILE);
  }
  console.log("Initializing new database");
  // initialize new Database
  const db = new Database(DB_FILE);
  await new Promise<void>((resolve, reject)=>{
    db.run(`
      CREATE TABLE agents(
        id TEXT PRIMARY KEY NOT NULL,
        class TEXT,
        flow TEXT,
        target_flow TEXT,
        last_heartbeat TEXT,
        manifest TEXT,
        flow_info TEXT,
        device_info TEXT,
        agent_info TEXT,
        config TEXT,
        flow_update_error TEXT
      )
    `, (err: Error|null)=>{
      if (err) {
        console.error("Couldn't create 'agents' table in database: ", err);
        reject(err);
      } else {
        resolve();
      }
    })
  });
  await new Promise<void>((resolve, reject)=>{
    db.run(`
      CREATE TABLE agent_classes(
        name TEXT PRIMARY KEY NOT NULL,
        flow TEXT,
        manifest TEXT
      )
    `, (err: Error|null)=>{
      if (err) {
        console.error("Couldn't initialize 'agent_classes' table in database: ", err);
        reject(err);
      } else {
        resolve();
      }
    })
  });
  await new Promise<void>((resolve, reject)=>{
    db.run(`
      CREATE TABLE alerts(
        agent TEXT,
        date TEXT,
        message TEXT
      )
    `, (err: Error|null)=>{
      if (err) {
        console.error("Couldn't initialize 'alerts' table in database: ", err);
        reject(err);
      } else {
        resolve();
      }
    })
  });
  return db;
}

async function createDirectory(dir: string):Promise<void> {
  return new Promise((resolve, reject)=>{
    fs.mkdir(dir, {}, (err)=>{
      if (!err) {
        resolve();
      } else if (err.code === 'EEXIST') {
        console.log("Data directory already exists");
        resolve();
      } else {
        console.error("Failed to create \".data\" directory: ", err);
        reject(err);
      }
    })
  })
}