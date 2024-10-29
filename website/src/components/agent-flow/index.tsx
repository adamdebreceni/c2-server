import * as React from "react";
import { useParams } from "react-router";
import { ServiceContext } from "../../common/service-context";
import { FlowEditor } from "../flow-editor";
import { FlowReadonlyEditor } from "../flow-readonly";

export function AgentFlow() {
  const [flow, setFlow] = React.useState<{id: string, value: FlowObject}|null>(null);
  const agentId = useParams<any>()["id"]!;
  const services = React.useContext(ServiceContext);
  React.useEffect(()=>{
    let mounted = true;
    services!.agents.fetchAgentInformation(agentId).then(agent => {
      if (!mounted) {
        return;
      }
      if (!agent?.flow) return;
      services!.flows.fetch(agent.flow).then(flow => {
        if (!mounted) return;
        if (flow) {
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