import { SendRequest } from "../utils/request"

export class AgentServiceImpl implements AgentService {
  constructor(private api: string) {}

  async fetchClasses(): Promise<AgentClassLike[]> {
    const response = await SendRequest("GET", this.api + "/class");
    if (!(response instanceof Array)) throw new Error(`Expected an array: ${response}`);
    return response;
  }
  async fetchAll(): Promise<AgentLike[]> {
    const agents: AgentLike[] = await SendRequest("GET", this.api + "/agent");
    if (!(agents instanceof Array)) throw new Error(`Expected an array: ${agents}`);
    return agents.map(agent => {
      if (agent.last_heartbeat) {
        agent.last_heartbeat = new Date(agent.last_heartbeat);
      }
      if (agent.flow_update_error) {
        try {
          agent.flow_update_error = JSON.parse(agent.flow_update_error as any) as any;
        } catch (e) {
          console.error(`Failed to parse flow update error: '${agent.flow_update_error}'`)
        }
      }
      return agent;
    });
  }
  async installExtensions(id: string, files: AssetInfo[]): Promise<void> {
    return SendRequest("POST", this.api + "/agent/update", {id, files});
  }
  async restart(id: string): Promise<void> {
    return SendRequest("POST", this.api + `/agent/restart/${id}`);
  }
  async fetchAgentInformation(id: string) : Promise<AgentLike|null> {
    const agent: AgentLike|null = await SendRequest("GET", this.api + "/agent/" + encodeURIComponent(id));
    if (agent && agent.last_heartbeat) {
      agent.last_heartbeat = new Date(agent.last_heartbeat);
    }
    return agent;
  }
  async dumpDebugInfo(id: string): Promise<{file: string}> {
    return SendRequest("POST", this.api + "/agent/debug/" + encodeURIComponent(id));
  }

  async stopComponent(agentId: string, componentId: string): Promise<void> {
    return SendRequest("POST", this.api + "/agent/" + encodeURIComponent(agentId) + "/stop-component/" + encodeURIComponent(componentId));
  }

  async startComponent(agentId: string, componentId: string): Promise<void> {
    return SendRequest("POST", this.api + "/agent/" + encodeURIComponent(agentId) + "/start-component/" + encodeURIComponent(componentId));
  }

  async configure(id: string, properties: {name: string, value: string, persist: boolean}[]): Promise<void> {
    return SendRequest("POST", this.api + `/agent/configure/${id}`, properties);
  }

  async sendRequest(id: string, req: JsonValue): Promise<string> {
    return SendRequest("POST", this.api + `/agent/${encodeURIComponent(id)}`, req);
  }
  async fetchAgentComponentState(agentId: string): Promise<ComponentKVStateMap | null> {
    return SendRequest("GET", this.api + `/agent/${encodeURIComponent(agentId)}/componentstate`)
  }

  async clearComponentState(agentId: string, componentId: string): Promise<void> {
    return SendRequest("DELETE", this.api + `/agent/${encodeURIComponent(agentId)}/componentstate`, [componentId])
  }

  async triggerComponent(agentId: string, componentId: string, args: RunInput): Promise<RunResult> {
    return SendRequest("POST", this.api + `/agent/${encodeURIComponent(agentId)}/run-component/${encodeURIComponent(componentId)}`, args);
  }

  async saveConfig(agentId: string, data: any): Promise<void> {
    return SendRequest("POST", this.api + `/agent/${encodeURIComponent(agentId)}/config`, data);
  }

  // async fetchManifestForAgent(id: string): Promise<AgentManifest|null> {
  //   const response = await SendRequest("GET", this.api + "/agent/manifest/" + encodeURIComponent(id));
  //   return JSON.parse(response);
  // }
  // async fetchManifestForClass(name: string): Promise<AgentManifest|null> {
  //   const response = await SendRequest("GET", this.api + "/class/manifest/" + encodeURIComponent(name));
  //   return JSON.parse(response);
  // }
}