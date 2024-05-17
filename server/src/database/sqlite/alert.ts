import * as sqlite from "sqlite3";

export class AlertDatabase {
  constructor(private db: sqlite.Database) {}
  async insert(alert: Alert): Promise<void> {
    console.log(`{agent: '${alert.agent}', date: '${alert.date.toISOString()}', message: '${alert.message}'`)
    return new Promise((resolve, reject)=>{
      this.db.run(`INSERT INTO alerts (agent, date, message) values (?, ?, ?)`, [alert.agent, alert.date.toISOString(), alert.message], (err: Error|null)=>{
        if (!err) {
          //console.error(`Inserted alert ${alert}`);
          resolve();
        } else {
          console.error(`Failed to insert alert ${alert}`);
          reject(err);
        }
      })
    })
  }
  async deleteBefore(agent: AgentId, time: Date): Promise<void> {
    return new Promise((resolve, reject)=>{
      this.db.run(`DELETE alerts WHERE agent = ? AND date < `, [agent, time.toISOString()], (err: Error|null)=>{
        if (!err) {
          resolve();
        } else {
          console.error(`Failed to delete alerts for agent ${agent}`);
          reject(err);
        }
      })
    })
  }

  async selectAfter(agent: AgentId, time: Date): Promise<Alert[]> {
    return new Promise((resolve, reject)=>{
      this.db.all(`SELECT agent,date,message FROM alerts WHERE agent = ? AND date >= ?`, [agent, time.toISOString()], (err: Error|null, rows: any[])=>{
        if (!err) {
          resolve(rows);
        } else {
          console.error(`Failed to select alerts for agent ${agent}`);
          reject(err);
        }
      })
    })
  }
}