import * as React from "react";
import { useState } from "react";

import "./index.scss";
import { VisibilityIcon } from "../../icons/visibility";
import { PropertyVisibility } from "../property-visibility";

export function Dropdown(props: {name: string, items: string[], initial?: string|null, onChange?: (item: string)=>void, width?: string, visible?: boolean, onChangeVisibility?: (name: string)=>void}) {
  const [state, setState] = useState({current: props.initial ?? props.items[0], active: false});
  const onBlur = React.useCallback(()=>{
    setState(curr => ({...curr, active: false}));
  }, [])
  const onFocus = React.useCallback(()=>{
    setState(curr => ({...curr, active: true}));
  }, [])
  const onChangeVisibility = React.useCallback(()=>{
    if (!props.onChangeVisibility) return;
    props.onChangeVisibility(props.name);
  }, [props.onChangeVisibility, props.name])
  return <div className="input-field" style={{width: props.width}}>
      <div style={{display: "flex", alignItems: "center"}}>
        <span className="input-label">{props.name}</span>
        {(props.onChangeVisibility ? <PropertyVisibility active={props.visible ?? false} onClick={onChangeVisibility}/> : null)}
      </div>
      <div className={`dropdown ${state.active ? "active": ""}`} tabIndex={-1} onBlur={onBlur} onFocus={onFocus}>
      <div className="selected">{state.current}
        <div className="down-icon">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path d="M7 10l5 5 5-5z"/></svg>
        </div>
      </div>
      <div className="dropdown-menu">
        {props.items.map(item=>{
          return <div key={item} className="dropdown-item" onClick={(e)=>{
            setState(curr => ({...curr, current: item}));
            props.onChange?.(item);
            e.currentTarget.parentElement?.parentElement?.blur();
          }}>{item}</div>
        })}
      </div>
    </div>
  </div>
}