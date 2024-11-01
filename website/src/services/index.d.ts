/// <reference path="../../../common/index.d.ts" />

interface AlertLike {
  agent: string
  date: Date
  message: string
}

interface AgentClassLike {
  name: string,
  flow: string|null,
  agent_count?: number,
  manifest?: string|null
}

interface AgentLike {
  id: string,
  class: string|null,
  flow: string|null,
  metrics: AgentMetrics|null,
  manifest?: string|null
  last_heartbeat: Date|null,
  flow_info: string|null
}

interface FlowInfo {
  flowId: Uuid,
  queues: {[id: Uuid]: {
    dataSize: number,
    dataSizeMax: number,
    name: string,
    size: number,
    sizeMax: number,
    uuid: Uuid
  }},
  components: {[name: string]: {
    running: boolean,
    uuid: Uuid
  }}
}

interface AgentMetrics {}

interface Services {
  flows: FlowService
  agents: AgentService
  alerts: AlertService
  files: FileService
}

interface FlowService {
  fetch(id: string): Promise<FlowObject|null>;
  fetchAll(): Promise<FlowLike[]>;
  create(template: {agent?: string, class?: string}): Promise<string>;
  save(id: string, flow: FlowObject): Promise<string>
  publish(id: string, agents: string[], classes: string[]): Promise<void>
}

interface AgentService {
  fetchClasses(): Promise<AgentClassLike[]>;
  fetchAll(): Promise<AgentLike[]>;
  installExtensions(id: string, files: AssetInfo[]): Promise<void>;
  configure(id: string, properties: {name: string, value: string, persist: boolean}[]): Promise<void>
  restart(id: string): Promise<void>
  fetchAgentInformation(id: string): Promise<AgentLike|null>;
  fetchAgentComponentState(agentId: string): Promise<ComponentKVStateMap|null>; 
  dumpDebugInfo(id: string): Promise<{file: string}>
  sendRequest(id: string, req: JsonValue): Promise<string>
  stopComponent(agentId: string, componentId: string): Promise<void>
  startComponent(agentId: string, componentId: string): Promise<void>
  clearComponentState(agentId: string, componentId: string): Promise<void>
  // fetchManifestForAgent(id: string): Promise<AgentManifest|null>;
  // fetchManifestForClass(name: string): Promise<AgentManifest|null>;
}

interface AlertService {
  fetchAfter(id: string, time: Date): Promise<AlertLike[]>
  deleteBefore(id: string, time: Date): Promise<void>
}

interface FileService {
  fetch(file: string): Promise<void>
}