import * as React from "react";
import { PlayIcon } from "../../icons/play";
import { PauseIcon } from "../../icons/pause";

import "./index.scss"

export function ComponentStatus(props: {className?: string, state: ComponentState, onStart?: ()=>void, onStop?: ()=>void}) {
  let on_click: (()=>void)|undefined = undefined;
  if (props.state === "STARTED") {
    on_click = props.onStop;
  }
  if (props.state === "STOPPED") {
    on_click = props.onStart;
  }
  return <div className={`component-status ${props.state} ${props.className ?? ''} ${!on_click ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={on_click}>
    {props.state === "STARTED" || props.state === "STOPPING" ? <PlayIcon size={20} /> : null}
    {props.state === "STOPPED" || props.state === "STARTING" ? <PauseIcon size={20} /> : null}
  </div>
}
