import * as React from "react";
import { FlowContext } from "../../common/flow-context";
import "./index.scss"
import { Tooltip } from "../tooltip";
import { WarningIcon } from "../../icons/warning";
import { ExtendedWidget, IsExtended } from "../extended-widget";
import { PlayIcon } from "../../icons/play";
import { PauseIcon } from "../../icons/pause";

export function Widget(props: {highlight?: boolean, service?: boolean, value: Component, link?: boolean, errors?: ErrorObject[], readonly?: boolean}) {
  const [grabbing, setGrabbing] = React.useState(false);
  const flow_context = React.useContext(FlowContext);
  const onmousedown = React.useCallback((e: React.MouseEvent)=>{
    if (e.button !== 0 || props.link) return;
    setGrabbing(true);
    e.stopPropagation();
  }, [props.link]);
  React.useEffect(()=>{
    if (!grabbing) return;
    const onmousemove = (e: MouseEvent)=>{
      flow_context?.moveComponent(props.value.id, e.movementX, e.movementY);
    }
    const onmouseup = (e: MouseEvent)=>{
      setGrabbing(false);
    }
    document.addEventListener('mousemove', onmousemove);
    document.addEventListener('mouseup', onmouseup);
    return ()=>{
      document.removeEventListener('mousemove', onmousemove);
      document.removeEventListener('mouseup', onmouseup);
    }
  }, [grabbing, props.value.id, flow_context?.moveComponent]);
  const oncontextmenu = React.useCallback((e: React.MouseEvent)=>{
    e.preventDefault();
    const {clientX, clientY} = e;
    flow_context?.showMenu({clientX, clientY}, [{name: "Edit", on: ()=>{
      flow_context.editComponent(props.value.id);
      flow_context.hideMenu();
    }},{name: "Delete", on: ()=>{
      flow_context.deleteComponent(props.value.id);
      flow_context.hideMenu();
    }}])
  }, [props.value.id, flow_context?.showMenu, flow_context?.deleteComponent])

  const ondblclick = React.useCallback(()=>{
    flow_context?.editComponent(props.value.id);
  }, [props.value.id, flow_context?.editComponent]);
  const component_ref = React.useRef<Component>();
  component_ref.current = props.value;
  const view_ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{
    if (!("scheduling" in component_ref.current!)) {
      return;
    }
    if (!view_ref.current) {
      return;
    }
    const rect = view_ref.current.getBoundingClientRect();
    let current_size: WidgetSize = {
      width: rect.width,
      height: rect.height
    };
    current_size.circular = !IsExtended(component_ref.current!);
    if (component_ref.current!.size instanceof Object
        && component_ref.current!.size.width === current_size.width
        && component_ref.current!.size.height === current_size.height
        && component_ref.current!.size.circular === current_size.circular) {
      return;
    }
    flow_context?.updateProcessor(props.value.id, curr => ({...curr, size: current_size}));
  }, [props.value, flow_context?.updateProcessor]);
  return <div className={`widget ${!grabbing && props.link ? "active": ""} ${props.highlight ? "highlight" : ""} ${props.service ? "service" : ""}`} style={{left: `${props.value.position.x}px`, top: `${props.value.position.y}px`}} onMouseDown={onmousedown} onContextMenu={oncontextmenu} onDoubleClick={ondblclick}>
    <div ref={view_ref} className={`processor-view ${IsExtended(props.value) ? "extended" : ""}`}>
      {(IsExtended(props.value) ? <ExtendedWidget value={props.value} /> : null)}
      {props.value.running !== undefined ?
        <ComponentState state={props.value.running} onClick={(()=>{
          if (props.value.running !== "STARTED" && props.value.running !== "STOPPED") {
            return undefined;
          }
          if (props.value.running === "STARTED" && flow_context?.stopProcessor) {
            return ()=>flow_context!.stopProcessor!(props.value.id);
          }
          if (props.value.running === "STOPPED" && flow_context?.startProcessor) {
            return ()=>flow_context!.startProcessor!(props.value.id);
          }
          return undefined;
        })()} /> 
        : null
      }
      {(props.errors?.length ?? 0) === 0 ? null : <div className="processor-errors"><Tooltip message={(()=>{
        const messages = [];
        let first = true;
        for (const err of props.errors!) {
          if (!first) {
            messages.push(<br/>);
          }
          first = false;
          messages.push(err.message);
        }
        return messages;
      })()}><WarningIcon size={20}/></Tooltip></div>}
      <div className="name">{props.value.name}</div>
    </div>
  </div>
}

function ComponentState(props: {state: ComponentState, onClick?: ()=>void}) {
  return <div className={`processor-state ${props.state}`} onClick={props.onClick}>
    {props.state === "STARTED" ? <PlayIcon size={20} /> : null}
    {props.state === "STOPPED" ? <PauseIcon size={20} /> : null}
  </div>
}