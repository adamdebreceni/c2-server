import * as sqlite from "sqlite3";

const selected_fields = ["name", "flow"];

export class AgentClassDatabase {
  constructor(private db: sqlite.Database) {}

  async insert(clazz: AgentClass): Promise<void> {
    return new Promise((resolve, reject)=>{
      this.db.run(`INSERT INTO agent_classes (name, flow, manifest) values (?, ?, ?)`, [clazz.name, clazz.flow, clazz.manifest], (err: Error|null)=>{
        if (!err) {
          console.log(`Registered agent class ${serialize(clazz)}`);
          resolve();
        } else {
          console.error(`Failed to registered agent class ${serialize(clazz)}`);
          reject(err);
        }
      })
    })
  }
  async update(clazz: Partial<AgentClass>, new_values: Partial<AgentClass>): Promise<void> {
    const selector = createWhereClause(clazz);
    if (!selector) throw new Error("No agent class selector is specified");
    const updater = createUpdateClause(new_values);
    if (!updater) throw new Error("Nothing to update");
    return new Promise((resolve, reject)=>{
      this.db.run(`UPDATE agent_classes SET ${updater.update} WHERE ${selector.query}`, [...updater.params, ...selector.params], (err: Error|null)=>{
        if (!err) {
          //console.log(`Updated agent class ${serialize(clazz)}`);
          resolve();
        } else {
          console.error(`Failed to update agent class ${serialize(clazz)}`);
          reject(err);
        }
      })
    })
  }

  async select(clazz: Partial<AgentClass>, includeManifest?: boolean): Promise<AgentClass[]> {
    const fields: string[] = [...selected_fields];
    if (includeManifest) fields.push('manifest');
    const selector = createWhereClause(clazz);
    if (!selector) {
      // select all
      return new Promise((resolve, reject)=>{
        this.db.all(`SELECT ${fields.join(", ")} FROM agent_classes`, (err: Error|null, rows: any[])=>{
          if (!err) {
            //console.log(`Selected ${rows.length} agent classes ${serialize(clazz)}`);
            resolve(rows);
          } else {
            console.error(`Failed to select agent class ${serialize(clazz)}`);
            reject(err);
          }
        })
      })
    }
    return new Promise((resolve, reject)=>{
      this.db.all(`SELECT ${fields.join(", ")} FROM agent_classes WHERE ${selector.query}`, [...selector.params], (err: Error|null, rows: any[])=>{
        if (!err) {
          //console.log(`Selected ${rows.length} agent classes from ${serialize(clazz)}`);
          resolve(rows);
        } else {
          console.error(`Failed to select agent class ${serialize(clazz)}`);
          reject(err);
        }
      })
    })
  }
}

function createWhereClause(agent: Partial<AgentClass>): {query: string, params: any[]}|null {
  const conditions: string[] = [];
  const params: any[] = [];
  for (const field of ["name", "flow", "manifest"]) {
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

function createUpdateClause(new_clazz: Partial<AgentClass>): {update: string, params: any[]}|null {
  const setter: string[] = [];
  const params: any[] = [];
  for (const field of ["flow", "manifest"]) {
    if (field in new_clazz) {
      setter.push(`${field} = ?`);
      params.push((new_clazz as any)[field]);
    }
  }
  if (setter.length === 0) {
    return null;
  }
  return {update: setter.join(", "), params};
}

function serialize(clazz: Partial<AgentClass>) {
  return "{" + Object.keys(clazz).map(key => `${key}: ${(clazz as any)[key]}`).join(", ") + "}";
}