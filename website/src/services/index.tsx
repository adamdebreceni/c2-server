/// <reference path="index.d.ts" />

import { AgentServiceImpl } from "./agent";
import { AlertServiceImpl } from "./alert";
import { FileServiceImpl } from "./file";
import { FlowServiceImpl } from "./flow";

export function CreateServices(): Services {
  return {
    flows: new FlowServiceImpl("/api/manage"),
    agents: new AgentServiceImpl("/api/manage"),
    alerts: new AlertServiceImpl("/api/alert"),
    files: new FileServiceImpl("/api/file")
  };
}