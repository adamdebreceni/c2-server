import { SendRequest } from "../utils/request";

export class FlowServiceImpl implements FlowService {
  constructor(private api: string) {}

  async fetch(id: string): Promise<FlowObject|null> {
    return await SendRequest("GET", this.api + "/flow/" + encodeURIComponent(id));
  }
  async fetchAll(): Promise<FlowLike[]> {
    const response = await SendRequest("GET", this.api + "/flow");
    for (const item of response) {
      if (item.modified) {
        item.modified = new Date(item.modified);
      } else {
        item.publishedOn = new Date(item.publishedOn);
      }
    }
    return response;
  }

  async create(template: {agent?: string, class?: string}): Promise<string> {
    return await SendRequest("POST", this.api + "/flow/create", template);
  }

  async save(id: string, flow: FlowObject): Promise<string> {
    return await SendRequest("PATCH", this.api + "/flow/" + encodeURIComponent(id), flow);
  }

  async publish(id: string, agents: string[], classes: string[]): Promise<void> {
    return await SendRequest("POST", this.api + "/flow/publish", {flowId: id, agents, classes});
  }

  async serialize(id: string): Promise<void> {
    return await SendRequest("POST", this.api + "/flow/serialize", {flowId: id});
  }

  async getSerialized(id: string) : Promise<string> {
    await SendRequest("POST", this.api + "/flow/serialize", {flowId: id});
    let flow_content = await SendRequest("GET", "/api/flows/" + id);
    console.log(flow_content);
    return flow_content;
  }
}