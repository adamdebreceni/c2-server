import * as React from "react";
import { FlowContext } from "../../common/flow-context";
import "./index.scss"
import { Tooltip } from "../tooltip";
import { WarningIcon } from "../../icons/warning";
import { ExtendedWidget, IsExtended } from "../extended-widget";
import { PlayIcon } from "../../icons/play";
import { PauseIcon } from "../../icons/pause";
import { SparkleIcon } from "../../icons/sparkle";
import { MergeIcon } from "../../icons/merge-icon";
import { ArrowRightIcon } from "../../icons/arrow-right";
import { ArrowLeftIcon } from "../../icons/arrow-left";
import { Fill } from "../fill/Fill";
import { height, width } from "../../utils/widget-size";
import { ArrowFullRightIcon } from "../../icons/arrow-full-right";
import { ArrowFullLeftIcon } from "../../icons/arrow-full-left";
import { ArrowFullUpIcon } from "../../icons/arrow-full-up";
import { ArrowFullDownIcon } from "../../icons/arrow-full-down";

const ARROW_SIZE = 20;

export function Widget(props: {highlight?: boolean, kind: string, value: Component, link?: boolean, errors?: ErrorObject[], readonly?: boolean, container?: Positionable|null, selected?: boolean, target?: Positionable|null}) {
  const [grabbing, setGrabbing] = React.useState(false);
  const flow_context = React.useContext(FlowContext);
  const onmousedown = React.useCallback((e: React.MouseEvent)=>{
    if (e.button !== 0 || props.link) return;
    flow_context?.setMovingComponent(props.value.id, true);
    e.stopPropagation();
  }, [props.link, props.value.id, flow_context?.setMovingComponent]);
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
  const component_ref = React.useRef<Component>(null);
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
  return <div className={`widget-container ${props.container ? 'active' : ''} ${props.selected ? 'selected' : ''}`} style={{left: `${props.container?.position.x ?? 0}px`, top: `${props.container?.position.y ?? 0}px`, width: `${props.container?.size?.width ?? 0}px`, height: `${props.container?.size?.height ?? 0}px`}}>
    <div className={`widget ${!grabbing && props.link ? "active": ""} ${props.highlight ? "highlight" : ""} ${props.kind}`} style={{left: `${props.value.position.x - (props.container?.position.x ?? 0)}px`, top: `${props.value.position.y - (props.container?.position.y ?? 0)}px`}} onMouseDown={onmousedown} onContextMenu={oncontextmenu} onDoubleClick={ondblclick}>
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
      {
        props.kind === 'funnel' ? <MergeIcon size={28} /> : null
      }
      {
        (()=>{
          const center = {x: props.value.position.x + width(props.value) / 2, y: props.value.position.y + height(props.value) / 2};
          if (props.kind === "input-port") {
            if (!props.target) {
              return <>
                <Fill/>
                <ArrowRightIcon size={18}/>
                <ArrowLeftIcon size={18}/>
                <Fill/>
              </>
            }
            if (Math.abs(props.target.position.x - center.x) < 1) {
              return <>
                <Fill/>
                <ArrowFullRightIcon size={ARROW_SIZE} />
                <Fill/>
              </>
            }
            if (Math.abs(props.target.position.x + width(props.target) - center.x) < 1) {
              return <>
                <Fill/>
                <ArrowFullLeftIcon size={ARROW_SIZE} />
                <Fill/>
              </>
            }
            if (Math.abs(props.target.position.y + - center.y) < 1) {
              return <>
                <Fill/>
                <ArrowFullDownIcon size={ARROW_SIZE} />
                <Fill/>
              </>
            }
            if (Math.abs(props.target.position.y + height(props.target) + - center.y) < 1) {
              return <>
                <Fill/>
                <ArrowFullUpIcon size={ARROW_SIZE} />
                <Fill/>
              </>
            }
            return <>
              <Fill/>
              <ArrowRightIcon size={18}/>
              <ArrowLeftIcon size={18}/>
              <Fill/>
            </>
          }
          if (props.kind === "output-port") {
            if (!props.target) {
              return <>
                <Fill/>
                <ArrowLeftIcon size={18}/>
                <ArrowRightIcon size={18}/>
                <Fill/>
              </>
            }
            if (Math.abs(props.target.position.x - center.x) < 1) {
              return <>
                <Fill/>
                <ArrowFullLeftIcon size={ARROW_SIZE} />
                <Fill/>
              </>
            }
            if (Math.abs(props.target.position.x + width(props.target) - center.x) < 1) {
              return <>
                <Fill/>
                <ArrowFullRightIcon size={ARROW_SIZE} />
                <Fill/>
              </>
            }
            if (Math.abs(props.target.position.y + - center.y) < 1) {
              return <>
                <Fill/>
                <ArrowFullUpIcon size={ARROW_SIZE} />
                <Fill/>
              </>
            }
            if (Math.abs(props.target.position.y + height(props.target) + - center.y) < 1) {
              return <>
                <Fill/>
                <ArrowFullDownIcon size={ARROW_SIZE} />
                <Fill/>
              </>
            }
            return <>
              <Fill/>
              <ArrowLeftIcon size={18}/>
              <ArrowRightIcon size={18}/>
              <Fill/>
            </>
          }
        })()
      }
      {
        props.kind === 'parameter-context' ? <>
          <svg xmlns="http://www.w3.org/2000/svg" height='20' viewBox="0 0 24 24" width='20' fill="var(--text-color)">
            <path d="M3 18h12v-2H3zM3 6v2h18V6zm0 7h18v-2H3z"></path>
          </svg>
        </> : null
      }
      {/* {
        props.kind === 'input-port' || props.kind === 'output-port' ? <>
          <div className="ripple-1" />
          <div className="ripple-2" />
          <div className="ripple-3" />
        </> : null
      } */}
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
      {
        props.kind === "input-port" || props.kind === "output-port" ? null :
        <div className="name flex items-center"><WidgetIcon type={props.value.type}/>{props.value.name}</div>
      }
    </div>
  </div>
  </div>
}

function ComponentState(props: {state: ComponentState, onClick?: ()=>void}) {
  return <div className={`processor-state ${props.state}`} onClick={props.onClick}>
    {props.state === "STARTED" || props.state === "STOPPING" ? <PlayIcon size={20} /> : null}
    {props.state === "STOPPED" || props.state === "STARTING" ? <PauseIcon size={20} /> : null}
  </div>
}

function WidgetIcon(props: {type: string}) {
  if (props.type.endsWith("AiProcessor")) {
    return <div className="inline-block mr-2"><SparkleIcon size={20} /></div>
  }
  return null;
}