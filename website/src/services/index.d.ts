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
  target_flow: string|null,  // null indicates that the class dictates the flow
  metrics: AgentMetrics|null,
  manifest?: string|null
  last_heartbeat: Date|null,
  flow_info: string|null,
  device_info: string|null,
  agent_info: string|null,
  config: string|null,
  flow_update_error: {target_flow: string, error: string}|null
}

interface FlowInfoDeprecated {
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

interface FlowInfo {
  flowId: Uuid,
  queues: {[id: Uuid]: {
      dataSize: number,
      dataSizeMax: number,
      size: number,
      sizeMax: number,
      sizeUtilization: number,
      dataSizeUtilization: number
  }},
  processorStatuses: ProcessorStatus[]
}

interface DeviceInfo {
  identifier: string,
  systemInfo: {
    machineArch: string,
    operatingSystem: string,
    vCores: number
    cpuLoadAverage: number,
    cpuUtilization?: number,
    memoryUsage?: number,
    physicalMem?: number,
  },
  networkInfo: {
    hostname: string,
    ipAddress: string,
    deviceId?: string,
  }
}

interface AgentInfo {
  agentManifest?: {
    agentType: string
  }
  status: {
    resourceConsumption: {
      cpuUtilization?: number,
      memoryUsage: number
    }
    uptime: number
  }
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
  import(class_name: string, flow: string): Promise<void>
  publish(id: string, agents: string[], classes: string[]): Promise<void>
  serialize(id: string): Promise<void>
  getSerialized(id: string): Promise<string>
}

interface AgentService {
  fetchClasses(): Promise<AgentClassLike[]>;
  fetchAll(): Promise<AgentLike[]>;
  installExtensions(id: string, files: AssetInfo[]): Promise<void>;
  configure(id: string, properties: {name: string, value: string, persist: boolean}[]): Promise<void>
  restart(id: string): Promise<void>
  fetchAgentInformation(id: string): Promise<AgentLike|null>;
  fetchAgentComponentState(agentId: string): Promise<ComponentKVStateMap|null>; 
  fetchAgentBulletins(agentId: string, from: Date, to: Date, limit: number): Promise<ProcessorBulletin[]>
  dumpDebugInfo(id: string): Promise<{file: string}>
  sendRequest(id: string, req: JsonValue): Promise<string>
  stopComponent(agentId: string, componentId: string): Promise<void>
  startComponent(agentId: string, componentId: string): Promise<void>
  clearComponentState(agentId: string, componentId: string): Promise<void>
  triggerComponent(agentId: string, componentId: string, args: RunInput): Promise<RunResult>
  saveConfig(agentId: string, data: any): Promise<void>
  linkClass(agentId: string): Promise<void>
  // fetchManifestForAgent(id: string): Promise<AgentManifest|null>;
  // fetchManifestForClass(name: string): Promise<AgentManifest|null>;
}

interface AlertService {
  fetchAfter(id: string, time: Date): Promise<AlertLike[]>
  deleteBefore(id: string, time: Date): Promise<void>
}

interface FileService {
  fetch(file: string): Promise<void>
  upload(file: File): {result: Promise<string>, abort: ()=>void, onProgress: (cb: (progress: number)=>void)=>void}
}
