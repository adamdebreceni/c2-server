import * as React from "react";
import { useNavigate, useParams } from "react-router";
import { ServiceContext } from "../../common/service-context";
import { FlowEditor } from "../flow-editor";
import { FlowReadonlyEditor } from "../flow-readonly";

import "./index.scss"
import { NotificationContext } from "../../common/notification-context";

export function AgentFlow() {
  const [flow, setFlow] = React.useState<{id: string, value: FlowObject}|null>(null);
  const agentId = useParams<any>()["id"]!;
  const services = React.useContext(ServiceContext);
  const notif = React.useContext(NotificationContext);
  React.useEffect(()=>{
    let mounted = true;
    services!.agents.fetchAgentInformation(agentId).then(agent => {
      if (!mounted) {
        return;
      }
      if (!agent?.flow) return;
      services!.flows.fetch(agent.flow).then(flow => {
        if (!mounted) return;
        let agent_config: AgentConfig = {};
        if (agent.config) {
          try {
            agent_config = JSON.parse(agent.config);
          } catch (e) {
            notif.emit("Failed to parse agent config", "error");
          }
        }
        if (flow) {
          flow.runs = agent_config;
          for (const proc of flow.processors) {
            proc.running = "UNKNOWN";
          }
          setFlow({id: agent.flow!, value: flow});
        }
      })
    })
    return ()=>{mounted = false;}
  }, [agentId]);

  if (!flow) return null;

  return <FlowReadonlyEditor id={flow.id} flow={flow.value} agentId={agentId}/>
}