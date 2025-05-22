/// <reference path="../../common/index.d.ts" />

interface Services{
  flowService: FlowService,
  agentService: AgentService
}

type FlowId = string;
type AgentId = string;

interface FlowService {
  getSerialized(id: FlowId): Promise<Buffer|null>
  get(id: FlowId): Promise<Buffer|null>
  save(flow: Buffer, id?: FlowId): Promise<FlowId>
  serialize(id: FlowId): Promise<void>
  createDefaultFlowObject(manifest: AgentManifest): FlowObject
  listAll(): Promise<FlowLike[]>
}

interface AgentService {
  fetchManifestForAgent(id: AgentId): Promise<string|null>
  pushBulletins(id: AgentId, bulletins: ProcessorBulletin[]): Promise<void>
  fetchBulletinsForAgent(id: AgentId, from: Date, to: Date, limit: number): Promise<ProcessorBulletin[]>
  fetchManifestForClass(name: string): Promise<string|null>
  fetch(): Promise<Agent[]>
  fetchAgent(id: AgentId): Promise<Agent|null>
  fetchClasses(): Promise<AgentClass[]>
  heartbeat(agent_heartbeat: {id: AgentId, class: string|null, flow: string|null, manifest: string|null, flow_info: string|null, device_info: string|null, agent_info: string|null}): Promise<{flow: FlowId|null, manifest: string|null}>
  publish(classes: string[], agents: AgentId[], flowId: FlowId): Promise<void>
  deleteAlertsBefore(id: AgentId, time: Date): Promise<void>
  pushAlerts( alerts: Alert[]): Promise<void>
  getAlertsAfter(id: AgentId, time: Date): Promise<Alert[]>
  saveConfig(id: AgentId, config: string): Promise<void>
  saveFlowUpdateFailure(id: AgentId, targetFlow: string, error: string): Promise<void>
}

interface Alert {
  agent: AgentId,
  date: Date,
  message: string
}

interface Agent {
  id: AgentId,
  class: string|null,
  flow: string|null,
  target_flow: string|null,  // null indicates that the class should dictate the flow
  last_heartbeat: string|null,
  manifest: string|null,
  flow_info: string|null
  device_info: string|null,
  agent_info: string|null,
  config: string|null,
  flow_update_error: string|null
}

interface AgentClass {
  name: string,
  flow: string|null,
  manifest: string|null
}