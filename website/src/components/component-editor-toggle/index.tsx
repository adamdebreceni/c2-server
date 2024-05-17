import * as React from "react";

import "./index.scss";

export function Toggle(props: {name: string, initial?: boolean, onChange?: (val: boolean)=>void}) {
  const [state, setState] = React.useState(props.initial ?? false);
  return <div className={`toggle ${state ? "active" : ""}`} onClick={()=>{setState(!state); props.onChange?.(!state)}}>
    <div className="body">
      <div className="inner"/>
    </div>
    <div className="name">{props.name}</div>
  </div>
}