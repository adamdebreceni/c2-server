import * as React from "react";
import { FlowContext } from "../../common/flow-context";
import { ConnectionErrorBadge } from "../connection-error/badge";
import "./index.scss";

export function IsInside(area: {x: number, y: number, w: number, h: number, circular: boolean}, x: number, y: number): boolean {
  if (area.circular) {
    return (area.x - x) ** 2 + (area.y - y) ** 2 <= (area.w / 2) ** 2;
  }
  return area.x - area.w/2 <= x && x <= area.x + area.w/2 && area.y - area.h/2 <= y && y <= area.y + area.h/2;
}

export function ConnectionView(props: {model?: Connection, id?: Uuid, from: {x: number, y: number, w: number, h: number, circular: boolean}, to: {x: number, y: number, w: number, h: number, circular: boolean}, name?: string}) {
  let from_x!: number, from_y!: number;
  {
    let dt = 0.25;
    let t = 0.5;
    for (let i = 0; i < 10; ++i ) {
      from_x = props.from.x + t * (props.to.x - props.from.x);
      from_y = props.from.y + t * (props.to.y - props.from.y);
      if (IsInside(props.from, from_x, from_y)) {
        t += dt;
      } else {
        t -= dt;
      }
      dt /= 2;
    }
    from_x = Math.ceil(from_x);
    from_y = Math.ceil(from_y);
  }


  let to_x!: number, to_y!: number;
  {
    let dt = 0.25;
    let t = 0.5;
    for (let i = 0; i < 10; ++i ) {
      to_x = props.to.x + t * (props.from.x - props.to.x);
      to_y = props.to.y + t * (props.from.y - props.to.y);
      if (IsInside(props.to, to_x, to_y)) {
        t += dt;
      } else {
        t -= dt;
      }
      dt /= 2;
    }
    to_x = Math.ceil(to_x);
    to_y = Math.ceil(to_y);
  }
  
  const left = Math.min(from_x, to_x);
  const top = Math.min(from_y, to_y);
  const width = Math.ceil(Math.abs(from_x - to_x));
  const height = Math.ceil(Math.abs(from_y - to_y));

  let x1 = from_x - left;
  let y1 = from_y - top;
  let x2 = to_x - left
  let y2 = to_y - top;

  const flow_context = React.useContext(FlowContext);

  const oncontextmenu = React.useCallback((e: React.MouseEvent)=>{
    const id = props.id;
    if (!id) return;
    e.preventDefault();
    const {clientX, clientY} = e;
    flow_context?.showMenu({clientX, clientY}, [{name: "Edit", on: ()=>{
      flow_context.editComponent(id);
      flow_context.hideMenu();
    }},{name: "Delete", on: ()=>{
      flow_context.deleteComponent(id)
      flow_context.hideMenu();
    }}])
  }, [flow_context?.showMenu, flow_context?.deleteComponent, props.id])

  const ondblclick = React.useCallback(()=>{
    if (!props.id) return;
    flow_context?.editComponent(props.id);
  }, [props.id, flow_context?.editComponent]);

  const svgRef = React.useRef<SVGSVGElement>(null);

  // React.useLayoutEffect(()=>{
  //   const svg = svgRef.current;
  //   if (svg) {
  //     const bbox = svg.querySelector("g")!.getBBox();
  //     svg.setAttribute("viewBox", [bbox.x, bbox.y, bbox.width, bbox.height].join(" "));
  //     svg.setAttribute("width", `${bbox.width}`);
  //     svg.setAttribute("height", `${bbox.height}`);
  //   }
  // })

  return <div className="connection-view" style={{left: `${left - 500}px`, top: `${top - 500}px`}}>
    <svg ref={svgRef} style={{display: 'block'}} viewBox={`-500 -500 ${width + 1000} ${height + 1000}`} width={width + 1000} height={height + 1000}>
    <defs>
      <marker id='head' orient="auto" markerWidth='6' markerHeight='6' refX='5' refY='3'>
        <path d='M0,0 V6 L6,3 Z' fill="black"/>
      </marker>
    </defs>
      {/*<path d={`M${x1},${y1} Q${xc},${yc} ${x2},${y2}`} stroke="black" strokeWidth="2" markerEnd='url(#head)'/>*/}
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="2" markerEnd='url(#head)'></line>
      </g>
    </svg>
    {
      props.id === undefined ? null :
      <div className="name" onContextMenu={oncontextmenu} onDoubleClick={ondblclick}>
        {props.name ? props.name : "<unspecified>"}
        {props.model?.errors.length !== 0 ? <ConnectionErrorBadge/> : null}
      </div>
    }
  </div>
}