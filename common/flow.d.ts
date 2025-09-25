type Time = string & {__Time__: "__Time__"};
type Size = string & {__Size__: "__Size__"};
type Uuid = string & {__Uuid__: "__Uuid__"};

type WidgetSize = {width: number, height: number, circular?: boolean};

interface Positionable {
  position: {x: number, y: number},
  size?: WidgetSize
}

type ComponentState = "UNKNOWN"|"STARTING"|"STARTED"|"STOPPING"|"STOPPED";
type ComponentKVState = {[k: string]: string};
type ComponentExtendedState = ComponentKVState|"DELETING"
type ComponentKVStateMap = {[id: string]: ComponentExtendedState}

interface ProcessorBulletin {
  id: number,
  timestamp: Date,
  level: string,
  category: string,
  message: string,
  groupId: string,
  groupName: string,
  groupPath: string,
  sourceId: string,
  sourceName: string
}

type FlowAsset = {id: Uuid, name: string, hash: string, size: number};

interface FlowAssetDirectory {
  id: Uuid,
  name: string,
  entries: (FlowAssetDirectory|FlowAsset)[]
}

interface FlowObject {
  manifest: AgentManifest,
  className?: string|null,
  parent?: string|null,
  view: {x: number, y: number, zoom: number}
  processors: Processor[]
  remoteProcessGroups: RPG[]
  remoteProcessGroupPorts: RPGPort[]
  connections: Connection[]
  services: MiNiFiService[]
  parameters: Parameter[]
  funnels: Funnel[]
  state?: ComponentKVStateMap;
  runs?: {[id: Uuid]: ProcessorRun[]|undefined}
  bulletins?: ProcessorBulletin[]
  processGroups?: ProcessGroup[],
  processGroupsPorts?: ProcessGroupPort[],
  parameterContexts?: ParameterContext[],
  assets?: FlowAssetDirectory['entries']
}

interface ParameterContextParam {
  name: string,
  value: string,
  sensitive: boolean,
  description: string|null
}

interface ParameterContext extends Component {
  description: string|null,
  parameters: ParameterContextParam[]
}

interface ProcessGroupPort extends Component {
  parentGroup: Uuid|null,
  type: 'INPUT'|'OUTPUT',
  side?: 'top'|'bottom'|'left'|'right'|null
}

interface ProcessGroup extends Positionable {
  id: Uuid,
  name: string,
  parentGroup: Uuid|null,
  parameterContext: Uuid|null
}

type AgentConfig = {[id: Uuid]: ProcessorRun[]|undefined}

interface AgentState {
  type: "agent"
  id: string
  class: string|null
  selected: boolean
  last_heartbeat: Date|null,
  flow: string|null,
  flow_update_error: {target_flow: string, error: string}|null
}

interface ClassState {
  type: "class"
  id: string
  selected: boolean
  agents: AgentState[]
}

interface PublishState {
  modal: boolean,
  pending: boolean,
  targetFlow: string|null,
  classes: ClassState[]
  agents: AgentState[]
}

interface ImportState {
  modal: boolean,
  classes: string[]
}

interface Component extends Positionable {
  id: Uuid,
  type: string,
  name: string,
  properties: {[name: string]: string|null}
  visibleProperties?: string[]
  running?: ComponentState
  parentGroup?: Uuid|null
}

interface Funnel extends Component {
  parentGroup: Uuid|null
}

interface Parameter {
  name: string,
  value: string,
  sensitive: boolean,
  description: string
}

interface ProcessorRun {
  id: Uuid
  input: RunInput
  output?: RunResult|"PENDING"
  expected?: RunResult
}

interface ProcessorStatus {
  id: Uuid,
  groupId: Uuid,
  bytesRead: number,
  bytesWritten: number,
  flowFilesIn: number,
  flowFilesOut: number,
  bytesIn: number,
  bytesOut: number,
  invocations: number,
  processingNanos: number,
  activeThreadCount: number,
  terminatedThreadCount: number,
  runStatus?: string,
}

interface Processor extends Component {
  penalty: string,
  yield: string,
  autoterminatedRelationships: {[name: string]: boolean},
  scheduling: Scheduling,
  bulletinLevel?: string,
  parentGroup: Uuid|null,
  status?: ProcessorStatus|null
}

interface Scheduling {
  strategy: "TIMER_DRIVEN" | "EVENT_DRIVEN" | "CRON_DRIVEN",
  concurrentTasks: string,
  runSchedule: string,
  runDuration: string
}

interface RPG extends Component {
  url: string,
  protocol: "RAW" | "HTTP",
  proxy: {host: string, port: number, user: string, password: string},
  localNetworkInterface: string
  connectionTimeout: Time,
  yield: Time
}

interface RPGPort extends Component {
  type: 'INPUT' | 'OUTPUT'
  compression: boolean,
  batch: {count: number, size: Size, duration: Time},
  targetId: Uuid | null,
  parentGroup: Uuid | null,
  rpg: Uuid | null
}

interface ConnectionSize {
  data: number
  count: number
  dataMax: number
  countMax: number
}

interface Connection {
  id: Uuid,
  name: string|null,
  errors: string[],
  attributes: string[],
  source: {id: Uuid, port: string|null},
  sourceRelationships: {[name: string]: boolean},
  destination: {id: Uuid, port: string|null},
  flowFileExpiration: string,
  swapThreshold: string|null,
  backpressureThreshold: {count: string, size: string}
  // the distance from the line connecting the source and destination
  // and when the connection is pointing right (x = 1, y = 0) which way the midPoint should be (positive for right, negative for left)
  // when the connection is a loop the position relative to the source
  midPoint?: number | {x: number, y: number}
  size?: ConnectionSize
}

interface MiNiFiService extends Component {}

type FlowLike = {
  id: string,
  parent: string|null,
  className: string|null
} & ({status: "editing", modified: Date} | {status: "published", publishedOn: Date})

type AssetInfo = {
  name: string,
  url: string,
  force?: boolean
}

type ErrorType = "RELATIONSHIP" | "PROPERTY";

interface ErrorObject {
  component: Uuid,
  type: ErrorType,
  target: string,
  message: string
}