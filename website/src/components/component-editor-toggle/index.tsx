import * as React from "react";

import "./index.scss";
import { WarningIcon } from "../../icons/warning";
import { Tooltip } from "../tooltip";

export function Toggle(props: {name: string, marginBottom?: string, initial?: boolean, onChange?: (val: boolean)=>void, error?: string}) {
  const [state, setState] = React.useState(props.initial ?? false);
  return <div className={`toggle ${state ? "active" : ""}`} onClick={()=>{setState(!state); props.onChange?.(!state)}} style={{marginBottom: props.marginBottom}}>
    <div className="body">
      <div className="inner"/>
    </div>
    <div className="name">{props.name}</div>
    {!props.error ? null : <>
      <div className="w-1"></div>
      <Tooltip message={props.error}><WarningIcon size={20}/></Tooltip>
    </>}
  </div>
}