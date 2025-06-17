import { SerializeFlow } from "../utils/flow-serializer";
import { SerializeFlowToJson } from "../utils/json-flow-serializer";

export async function CreateFlowService(db: Database): Promise<FlowService> {
  return {
    getSerialized(id: FlowId): Promise<Buffer|null> {
      return db.flows.getSerialized(id);
    },
    get(id: FlowId): Promise<Buffer|null> {
      return db.flows.get(id);
    },
    save(flow: FlowObject, id?: FlowId): Promise<FlowId> {
      return db.flows.save(flow, id);
    },
    serialize(id: FlowId): Promise<void> {
      return db.flows.serialize(id, (data: Buffer)=>{
        return Buffer.from(SerializeFlowToJson(id, JSON.parse(data.toString())));
      });
    },
    listAll(): Promise<FlowLike[]> {
      return db.flows.listAll();
    },
    createDefaultFlowObject(manifest: AgentManifest): FlowObject {
      return {
        manifest,
        parent: null,
        view: {x: 0, y: 0, zoom: 1},
        processors: [],
        connections: [],
        remoteProcessGroups: [],
        funnels: [],
        services: [],
        parameters: []
      }
    }
  }
}