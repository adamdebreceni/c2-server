import { CreateAgentService } from "./agent-service";
import { CreateFlowService } from "./flow-service";

export async function CreateServices(db: Database): Promise<Services> {
  return {
    flowService: await CreateFlowService(db),
    agentService: await CreateAgentService(db)
  };
}