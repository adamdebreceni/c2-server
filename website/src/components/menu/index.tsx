import * as React from "react";
import { FlowContext } from "../../common/flow-context";
import "./index.scss";

export function Menu(props: {items: {name: string, on: ()=>void}[]}) {
  const flow_context = React.useContext(FlowContext);
  const ref = React.useRef<HTMLDivElement>(null);
  const onBlur = React.useCallback(()=>{
    flow_context?.hideMenu();
  }, [flow_context?.hideMenu])
  React.useLayoutEffect(()=>{
    ref.current?.focus();
  }, [])
  return <div className="menu" ref={ref} tabIndex={-1} onBlur={onBlur}>
    {
      props.items.map(item => <MenuItem key={item.name} name={item.name} on={item.on}/>)
    }
  </div>
}

function MenuItem(props: {name: string, on: ()=>void}) {
  return <div className="menu-item" onClick={props.on}>
    {props.name}
  </div>
}