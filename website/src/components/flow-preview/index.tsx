import * as React from "react";
import { useNavigate } from "react-router";

import "./index.scss";

export function FlowPreview(props: {value: FlowLike}) {
  const navigate = useNavigate();
  return <div className="flow-preview">
    <div className="flow-id" onClick={()=>navigate(`/flow/${props.value.id}`)}>{props.value.id}</div>
    <div className="date">{
      (()=>{
        if (props.value.status === "editing") {
          return "Last modified on " + props.value.modified.toString()
        } else {
          return "Published on " + props.value.publishedOn.toString()
        }
      })()
    }</div>
  </div>
}