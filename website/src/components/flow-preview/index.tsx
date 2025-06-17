import * as React from "react";
import { useNavigate } from "react-router";

import "./index.scss";
import { Tooltip } from "../tooltip";

export function FlowPreview(props: {value: FlowLike, agentCount: number, classes: string[]}) {
  const navigate = useNavigate();
  return <div className="flow-preview">
    <div className="flow-id" onClick={()=>navigate(`/flow/${props.value.id}`)}>{props.value.id}</div>
    {props.value.className ?
      <div className={`flow-class-name ${props.classes.includes(props.value.className) ? 'assigned' : ''}`}>{props.value.className}</div>
    : null}
    {props.classes.map(clazz => {
      if (clazz === props.value.className) {
        return null;
      }
      return <div key={clazz} className="flow-class-name">{clazz}</div>
    })}
    {(()=>{
      if (props.agentCount === 0) {
        return null;
      }
      return <div className="agent-count" onClick={() => {
        navigate(`/agents?flow=${props.value.id}`)
      }}>{props.agentCount} agents</div>
    })()}
    <div className="date">{
      (()=>{
        if (props.value.status === "editing") {
          return "Last modified on " + props.value.modified.toLocaleString()
        } else {
          return "Published on " + props.value.publishedOn.toLocaleString()
        }
      })()
    }</div>
  </div>
}