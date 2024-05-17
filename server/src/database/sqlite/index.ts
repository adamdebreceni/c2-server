import * as sqlite from 'sqlite3';
import {RunResult} from 'sqlite3';
import { AgentDatabase } from './agent';
import { AlertDatabase } from './alert';
import { AgentClassDatabase } from './class';
import { FlowDatabase } from './flow';
import { initialize } from './initialize';

export async function CreateSQLite(): Promise<Database> {
  return new SQLiteDatabase(await initialize());
}

class SQLiteDatabase implements Database {
  agents: AgentDatabase;
  flows: FlowDatabase;
  classes: AgentClassDatabase;
  alerts: AlertDatabase;
  constructor(private db: sqlite.Database) {
    this.agents = new AgentDatabase(db);
    this.flows = new FlowDatabase(db);
    this.classes = new AgentClassDatabase(db);
    this.alerts = new AlertDatabase(db);
  }
}