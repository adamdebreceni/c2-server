import * as React from "react";
import { useHistory } from "react-router";
import { ServiceContext } from "../../common/service-context";

import "./index.scss";

export function AgentClass(props: {value: AgentClassLike}) {
  const services = React.useContext(ServiceContext);
  const history = useHistory();
  return <div className="agent-class">
    <div className="name-flow">
      <div className="name">{props.value.name}</div>
      <div className="flow" onClick={()=>{
        if (props.value.flow) {
          services?.flows.fetch(props.value.flow).then(flow=>{
            if (!flow) {
              services?.flows.create({class: props.value.name}).then(id => {
                history.push(`/flow/${id}`);
              })
            } else {
              history.push(`/flow/${props.value.flow}`)
            }
          })
        } else {
          services?.flows.create({class: props.value.name}).then(id => {
            history.push(`/flow/${id}`);
          })
        }
      }}>{props.value.flow ?? "No flow is published yet"}</div>
    </div>
    <div className="fill"/>
    <div className="agent-count" onClick={()=>history.push(`/agents?class=${props.value.name}`)}>{props.value.agent_count ?? "-"}</div>
  </div>
}