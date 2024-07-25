import * as React from "react";
import { FlowContext } from "../../common/flow-context";
import "./index.scss"
import { Tooltip } from "../tooltip";
import { WarningIcon } from "../../icons/warning";

export function Widget(props: {highlight?: boolean, service?: boolean, value: Component, deg?: number, errors?: ErrorObject[]}) {
  const [grabbing, setGrabbing] = React.useState(false);
  const flow_context = React.useContext(FlowContext);
  const onmousedown = React.useCallback((e: React.MouseEvent)=>{
    if (e.button !== 0 || props.deg !== undefined) return;
    setGrabbing(true);
    e.stopPropagation();
  }, [props.deg]);
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
  return <div className={`widget ${!grabbing && props.deg !== undefined ? "active": ""} ${props.highlight ? "highlight" : ""} ${props.service ? "service" : ""}`} style={{left: `${props.value.position.x}px`, top: `${props.value.position.y}px`}} onMouseDown={onmousedown} onContextMenu={oncontextmenu} onDoubleClick={ondblclick}>
    <div className="processor-view">
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
      <div className="connection-icon-container" style={props.deg !== undefined ? {transform: `rotate(${props.deg * 180 / Math.PI - 90}deg)`}: undefined}>
        <div className="connection-icon">
          <svg xmlns="http://www.w3.org/2000/svg" height="12" viewBox="0 0 12 12" width="12"><path d="M0,0 H12 L6,12 Z"/></svg>
        </div>
      </div>
    </div>
  </div>
}