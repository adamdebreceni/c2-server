type Time = string & {__Time__: "__Time__"};
type Size = string & {__Size__: "__Size__"};
type Uuid = string & {__Uuid__: "__Uuid__"};

interface Positionable {
  position: {x: number, y: number}
}

interface FlowObject {
  manifest: AgentManifest,
  view: {x: number, y: number, zoom: number}
  processors: Processor[]
  remoteProcessGroups: RPC[]
  connections: Connection[]
  services: MiNiFiService[]
  parameters: Parameter[]
  funnels: Funnel[]
}

interface Component extends Positionable {
  id: Uuid,
  type: string,
  name: string,
  properties: {[name: string]: string|null}
}

interface Funnel extends Positionable {
  id: Uuid
}

interface Parameter {
  name: string,
  value: string,
  sensitive: boolean,
  description: string
}

interface Processor extends Component {
  penalty: string,
  yield: string,
  autoterminatedRelationships: {[name: string]: boolean},
  scheduling: Scheduling
}

interface Scheduling {
  strategy: "TIMER_DRIVEN" | "EVENT_DRIVEN" | "CRON_DRIVEN",
  concurrentTasks: string,
  runSchedule: string,
  runDuration: string
}

interface RPC extends Positionable {
  id: Uuid,
  url: string,
  protocol: "RAW" | "HTTP",
  proxy: {host: string, port: number},
  localNetworkInterface: string
  connectionTimeout: Time,
  yield: Time
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
}

interface MiNiFiService extends Component {}

type FlowLike = {
  id: string
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