import * as React from "react";
import { FlowContext } from "../../common/flow-context";
import { ConnectionErrorBadge } from "../connection-error/badge";
import "./index.scss";

export function ConnectionView(props: {model?: Connection, id?: Uuid, from: {x: number, y: number}, to: {x: number, y: number}, name?: string, exactEnd?: boolean}) {
  const padding = 5;

  const left = Math.min(props.from.x, props.to.x);
  const top = Math.min(props.from.y, props.to.y);
  const width = Math.ceil(Math.abs(props.from.x - props.to.x)) + 2*padding;
  const height = Math.ceil(Math.abs(props.from.y - props.to.y)) + 2*padding;

  let x1 = props.from.x - left + padding;
  let y1 = props.from.y - top + padding;
  let x2 = props.to.x - left + padding
  let y2 = props.to.y - top + padding;

  const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  const off = 30;

  if (d > 1) {
    [x1, y1, x2, y2] = [
      x1 + (x2 - x1)/d * (props.exactEnd ? Math.min(off, d) : Math.min(off, d/2)),
      y1 + (y2 - y1)/d * (props.exactEnd ? Math.min(off, d) : Math.min(off, d/2)),
      props.exactEnd ? x2 : x2 + (x1 - x2)/d * Math.min(off, d/2),
      props.exactEnd ? y2 : y2 + (y1 - y2)/d * Math.min(off, d/2)
    ]
  }

  let [v1, v2] = [x2 - x1, y2 - y1];
  const v_len = Math.sqrt(v1 ** 2 + v2 ** 2);
  [v1, v2] = [v1 / v_len, v2 / v_len];
  let [t1, t2] = [-v2, v1];
  const t_len = 50;
  let [xt, yt] = [v1 * v_len / 2 + t1 * t_len, v2 * v_len / 2 + t2 * t_len];

  const p1_len = Math.sqrt((x1 - xt) ** 2 + (y1 - yt) ** 2);
  const p2_len = Math.sqrt((x2 - xt) ** 2 + (y2 - yt) ** 2);
  let [xc, yc] = [(x1 - xt) / p1_len + (x2 - xt) / p2_len, (y1 - yt) / p1_len + (y2 - yt) / p2_len];
  [xc, yc] = [xt - Math.sqrt(p1_len * p2_len) / 2 * xc, yt - Math.sqrt(p1_len * p2_len) / 2 * yc];

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

  return <div className="connection-view" style={{left: `${left - padding - 500}px`, top: `${top - padding - 500}px`}}>
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