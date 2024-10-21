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

export function ConnectionView(props: {model?: Connection, id?: Uuid, from: {x: number, y: number, w: number, h: number, circular: boolean}, to: {x: number, y: number, w: number, h: number, circular: boolean}, name?: string, midPoint?: {x: number, y: number}|number}) {
  const midPoint = props.model?.midPoint ?? props.midPoint;
  
  let v_x = props.to.x - props.from.x;
  let v_y = props.to.y - props.from.y;

  const d = Math.sqrt(v_x ** 2 + v_y ** 2);
  v_x = v_x / d;
  v_y = v_y / d;

  const mid_x = (props.from.x + props.to.x) / 2;
  const mid_y = (props.from.y + props.to.y) / 2;

  let name_pos: {x: number, y: number} = {x: mid_x, y: mid_y};
  let arc: {x: number, y: number, r: number, dir: number, a1: number, a2: number}|null = null;

  if (typeof midPoint === "number" && Math.abs(midPoint) > 1) {
    const mid2name_x = midPoint >= 0 ? -v_y : v_y;
    const mid2name_y = midPoint >= 0 ? v_x : -v_x;

    const mid_dist = Math.abs(midPoint);

    name_pos.x = mid_x + mid2name_x * mid_dist;
    name_pos.y = mid_y + mid2name_y * mid_dist;

    // r^2 = (r - mid_dist)^2 + (dist / 2)^2
    // r^2 = r^2 - 2 * r * mid_dist + mid_dist^2 + dist^2 / 4
    // r = 1 / (2 * mid_dist) * (mid_dist^2 + dist^2 / 4)
    const r = 1 / (2 * mid_dist) * (mid_dist ** 2 + d ** 2 / 4);

    let arc_x = name_pos.x - mid2name_x * r;
    let arc_y = name_pos.y - mid2name_y * r;

    let a1 = Math.atan2(props.from.y - arc_y, props.from.x - arc_x);
    let a2 = Math.atan2(props.to.y - arc_y, props.to.x - arc_x);

    if (midPoint >= 0) {
      while (a2 < 0) a2 += 2 * Math.PI;
      while (a1 < a2) a1 += 2 * Math.PI;
    } else {
      while (a1 < 0) a1 += 2 * Math.PI;
      while (a2 < a1) a2 += 2 * Math.PI;
    }

    arc = {x: arc_x, y: arc_y, r: r, a1, a2, dir: midPoint < 0 ? 1 : 0};
  } else if (typeof midPoint === "object") {
    // loop connection
    name_pos.x = mid_x + midPoint.x;
    name_pos.y = mid_y + midPoint.y;

    const r = Math.sqrt(midPoint.x ** 2 + midPoint.y ** 2) / 2;

    let arc_x = (mid_x + name_pos.x) / 2;
    let arc_y = (mid_y + name_pos.y) / 2;

    let a1 = Math.atan2(props.from.y - arc_y, props.from.x - arc_x);
    while (a1 < 0) a1 += 2 * Math.PI;
    let a2 = a1 + 2 * Math.PI;

    arc = {x: arc_x, y: arc_y, r: r, a1, a2, dir: 1};
  }
  
  
  let from_t!: number;
  let from_x!: number, from_y!: number;
  if (arc === null) {
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
    from_t = t;
  } else {
    let dt = 0.25;
    let t = 0.5;
    for (let i = 0; i < 10; ++i ) {
      from_x = arc.x + arc.r * Math.cos((1 - t) * arc.a1 + t * arc.a2);
      from_y = arc.y + arc.r * Math.sin((1 - t) * arc.a1 + t * arc.a2);
      if (IsInside(props.from, from_x, from_y)) {
        t += dt;
      } else {
        t -= dt;
      }
      dt /= 2;
    }
    from_x = Math.ceil(from_x);
    from_y = Math.ceil(from_y);
    from_t = t;
  }


  let to_x!: number, to_y!: number;
  if (arc === null) {
    let dt = 0.25;
    let t = 0.5;
    for (let i = 0; i < 10; ++i ) {
      to_x = props.from.x + t * (props.to.x - props.from.x);
      to_y = props.from.y + t * (props.to.y - props.from.y);
      if (IsInside(props.to, to_x, to_y)) {
        t -= dt;
      } else {
        t += dt;
      }
      dt /= 2;
    }
    to_x = Math.ceil(to_x);
    to_y = Math.ceil(to_y);
    name_pos.x = props.from.x + (t + from_t) / 2 * (props.to.x - props.from.x);
    name_pos.y = props.from.y + (t + from_t) / 2 * (props.to.y - props.from.y);
  } else {
    let dt = 0.25;
    let t = 0.5;
    for (let i = 0; i < 10; ++i ) {
      to_x = arc.x + arc.r * Math.cos((1 - t) * arc.a1 + t * arc.a2);
      to_y = arc.y + arc.r * Math.sin((1 - t) * arc.a1 + t * arc.a2);
      if (IsInside(props.to, to_x, to_y)) {
        t -= dt;
      } else {
        t += dt;
      }
      dt /= 2;
    }
    to_x = Math.ceil(to_x);
    to_y = Math.ceil(to_y);
    name_pos.x = arc.x + arc.r * Math.cos((1 - (t + from_t)/2) * arc.a1 + (t + from_t)/2 * arc.a2);
    name_pos.y = arc.y + arc.r * Math.sin((1 - (t + from_t)/2) * arc.a1 + (t + from_t)/2 * arc.a2);
  }
  
  const left = Math.min(from_x, to_x);
  const top = Math.min(from_y, to_y);
  const width = Math.ceil(Math.abs(from_x - to_x));
  const height = Math.ceil(Math.abs(from_y - to_y));

  let x1 = from_x - left;
  let y1 = from_y - top;
  let x2 = to_x - left
  let y2 = to_y - top;

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
      <g>
        {/* {(arc === null) ? null :
          <circle cx={arc!.x - left} cy={arc!.y - top} r={5} fill="black"/>
        } */}
        {(arc === null) ?
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="2" markerEnd='url(#head)'></line> :
          <path d={`M${x1},${y1} A ${arc.r} ${arc.r} 0 0 ${arc.dir} ${name_pos.x - left} ${name_pos.y - top} A ${arc.r} ${arc.r} 0 0 ${arc.dir} ${x2} ${y2}`} fill="none" stroke="black" strokeWidth="2" markerEnd='url(#head)'/>
        }
      </g>
    </svg>
    {
      props.id === undefined ? null :
      <ConnectionName id={props.id} model={props.model!} x={name_pos.x - (left - 500)} y={name_pos.y - (top - 500)} name={props.name} />
    }
  </div>
}

function ConnectionName(props: {id: Uuid, model: Connection, x: number, y: number, name?: string}) {
  const [grabbing, setGrabbing] = React.useState(false);
  const flow_context = React.useContext(FlowContext);
  const view_ref = React.useRef<HTMLDivElement>(null);
  const onmousedown = React.useCallback((e: React.MouseEvent)=>{
    if (e.button !== 0) return;
    setGrabbing(true);
    e.stopPropagation();
  }, []);
  React.useEffect(()=>{
    if (!grabbing) return;
    const onmousemove = (e: MouseEvent)=>{
      flow_context?.moveConnection(props.id, e.movementX, e.movementY);
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
  }, [grabbing, props.id, flow_context?.updateConnection]);

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

  return <div ref={view_ref} className="name" style={{left: `${props.x}px`, top: `${props.y}px`}} onContextMenu={oncontextmenu} onMouseDown={onmousedown} onDoubleClick={ondblclick}>
    {props.name ? props.name : "<unspecified>"}
    {props.model?.errors.length !== 0 ? <ConnectionErrorBadge/> : null}
  </div>
}