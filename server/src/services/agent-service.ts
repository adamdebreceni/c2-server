export async function CreateAgentService(db: Database): Promise<AgentService> {
  return {
    async fetchManifestForAgent(id: string): Promise<string|null> {
      const agents = await db.agents.select({id}, true);
      if (agents.length !== 1) return null;
      return agents[0].manifest;
    },
    async fetchManifestForClass(name: string): Promise<string|null> {
      const classes = await db.classes.select({name}, true);
      if (classes.length !== 1) return null;
      return classes[0].manifest;
    },
    fetch(): Promise<Agent[]> {
      return db.agents.select({});
    },
    async fetchAgent(id: string): Promise<Agent|null> {
      const agents = await db.agents.select({id}, true);
      if (agents.length === 0) return null;
      return agents[0];
    },
    fetchClasses(): Promise<AgentClass[]> {
      return db.classes.select({});
    },
    async heartbeat(agent_heartbeat: {id: string, class: string|null, flow: string | null, manifest: string|null}): Promise<FlowId|null> {
      const agent = {...agent_heartbeat, last_heartbeat: new Date().toISOString()};
      const agents = await db.agents.select({id: agent.id});
      if (agents.length > 1) {
        throw new Error("More than one agent with the same id in the database?");
      }
      let target_flow: string|null = null;
      if (agents.length === 1) {
        // console.log(`Updating agent id: ${agent.id}`);
        const agent_update: Partial<Agent> = {...agent};
        if (agent_update.manifest === null) {
          delete agent_update.manifest;
        }
        await db.agents.update({id: agent.id}, agent_update);
        target_flow = agents[0].target_flow;
      } else {
        console.log(`Registering agent with id: "${agent.id}"`);
        await db.agents.insert({...agent, target_flow: null});
      }
      if (agent.class === null) {
        return null;
      }
      const class_descr = await db.classes.select({name: agent.class});
      if (class_descr.length === 1) {
        if (typeof agent.manifest === "string" && agent.manifest !== class_descr[0].manifest) {
          // update class with new manifest
          await db.classes.update({name: agent.class}, {manifest: agent.manifest});
        }
        return target_flow ?? class_descr[0].flow;
      }
      if (class_descr.length > 1) {
        throw new Error("More than one agent class with the same name in the database?");
      }
      console.log(`Registering new agent class with name: "${agent.class}"`);
      await db.classes.insert({name: agent.class, flow: null, manifest: agent.manifest});
      return target_flow;
    },
    async publish(classes: string[], agents: string[], flowId: string): Promise<void> {
      for (const clazz of classes) {
        await db.classes.update({name: clazz}, {flow: flowId});
      }
      for (const agent of agents) {
        await db.agents.update({id: agent}, {target_flow: flowId});
      }
    },
    async deleteAlertsBefore(id: AgentId, time: Date): Promise<void> {
      return db.alerts.deleteBefore(id, time);
    },
    async pushAlerts(alerts: Alert[]): Promise<void> {
      for (const alert of alerts) {
        await db.alerts.insert(alert);
      }
    },
    async getAlertsAfter(id: AgentId, time: Date): Promise<Alert[]> {
      return db.alerts.selectAfter(id, time);
    }
  }
}