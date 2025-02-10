import * as sqlite from "sqlite3";

const selected_fields = ["id", "class", "flow", "last_heartbeat", "target_flow", "flow_info", "device_info", "agent_info", "config", "flow_update_error"] as const;

export class AgentDatabase {
  constructor(private db: sqlite.Database) {}

  async insert(agent: Agent): Promise<void> {
    return new Promise((resolve, reject)=>{
      this.db.run(`INSERT INTO agents (id, class, flow, target_flow, manifest, flow_info, device_info, agent_info, config, flow_update_error) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [agent.id, agent.class, agent.flow, agent.target_flow, agent.manifest, agent.flow_info, agent.device_info, agent.agent_info, agent.config, agent.flow_update_error], (err: Error|null)=>{
        if (!err) {
          console.log(`Registered agent ${serialize(agent)}`);
          resolve();
        } else {
          console.error(`Failed to registered agent ${serialize(agent)}`);
          reject(err);
        }
      })
    })
  }
  async update(agent: Partial<Agent>, new_values: Partial<Agent>): Promise<void> {
    const selector = createWhereClause(agent);
    if (!selector) throw new Error("No agent selector is specified");
    const updater = createUpdateClause(new_values);
    if (!updater) throw new Error("Nothing to update");
    return new Promise((resolve, reject)=>{
      this.db.run(`UPDATE agents SET ${updater.update} WHERE ${selector.query}`, [...updater.params, ...selector.params], (err: Error|null)=>{
        if (!err) {
          //console.log(`Updated agent ${serialize(agent)}`);
          resolve();
        } else {
          console.error(`Failed to update agent ${serialize(agent)}`);
          reject(err);
        }
      })
    })
  }

  async delete(agent: Partial<Agent>): Promise<void> {
    const selector = createWhereClause(agent);
    if (!selector) throw new Error("No agent selector is specified");
    return new Promise((resolve, reject)=>{
      this.db.run(`DELETE agents WHERE ${selector.query}`, [...selector.params], (err: Error|null)=>{
        if (!err) {
          console.log(`Deleted agent ${serialize(agent)}`);
          resolve();
        } else {
          console.error(`Failed to delete agent ${serialize(agent)}`);
          reject(err);
        }
      })
    })
  }

  async select(agent: Partial<Agent>, includeManifest?: boolean): Promise<Agent[]> {
    const fields: string[] = [...selected_fields];
    if (includeManifest) fields.push("manifest");
    const selector = createWhereClause(agent);
    if (!selector) {
      // select all
      return new Promise((resolve, reject)=>{
        this.db.all(`SELECT ${fields.join(", ")} FROM agents`, (err: Error|null, rows: any[])=>{
          if (!err) {
            //console.log(`Selected ${rows.length} agents ${serialize(agent)}`);
            resolve(rows);
          } else {
            console.error(`Failed to select agent ${serialize(agent)}`);
            reject(err);
          }
        })
      })
    }
    return new Promise((resolve, reject)=>{
      this.db.all(`SELECT ${fields.join(", ")} FROM agents WHERE ${selector.query}`, [...selector.params], (err: Error|null, rows: any[])=>{
        if (!err) {
          //console.log(`Selected ${rows.length} agents from ${serialize(agent)}`);
          resolve(rows);
        } else {
          console.error(`Failed to select agents ${serialize(agent)}`);
          reject(err);
        }
      })
    })
  }
}

export function createWhereClause(agent: Partial<Agent>): {query: string, params: any[]}|null {
  const conditions: string[] = [];
  const params: any[] = [];
  for (const field of ["id", "class", "flow", "last_heartbeat", "target_flow", "manifest", "flow_info", "device_info", "agent_info", "config", "flow_update_error"]) {
    if (field in agent) {
      conditions.push(`${field} = ?`);
      params.push((agent as any)[field]);
    }
  }
  if (conditions.length === 0) {
    return null;
  }
  return {query: conditions.join(" AND "), params};
}

function createUpdateClause(new_agent: Partial<Agent>): {update: string, params: any[]}|null {
  const setter: string[] = [];
  const params: any[] = [];
  for (const field of ["class", "flow", "last_heartbeat", "target_flow", "manifest", "flow_info", "device_info", "agent_info", "config", "flow_update_error"]) {
    if (field in new_agent) {
      setter.push(`${field} = ?`);
      params.push((new_agent as any)[field]);
    }
  }
  if (setter.length === 0) {
    return null;
  }
  return {update: setter.join(", "), params};
}

function serialize(agent: Partial<Agent>) {
  return "{" + Object.keys(agent).map(key => `${key}: ${(agent as any)[key]}`).join(", ") + "}";
}