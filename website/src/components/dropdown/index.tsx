import * as React from "react";
import { useState } from "react";

import "./index.scss";
import { VisibilityIcon } from "../../icons/visibility";
import { PropertyVisibility } from "../property-visibility";
import { Tooltip } from "../tooltip";
import { WarningIcon } from "../../icons/warning";

export function Dropdown(props: {name: string, items: string[], initial?: string|null, onChange?: (item: string, idx: number)=>void, width?: string, visible?: boolean, onChangeVisibility?: (name: string)=>void, error?: string}) {
  const [state, setState] = useState({current: props.initial ?? null, active: false});
  const onBlur = React.useCallback(()=>{
    if (!props.onChange) return;
    setState(curr => ({...curr, active: false}));
  }, [props.onChange])
  const onFocus = React.useCallback(()=>{
    if (!props.onChange) return;
    setState(curr => ({...curr, active: true}));
  }, [props.onChange])
  const onChangeVisibility = React.useCallback(()=>{
    if (!props.onChangeVisibility) return;
    props.onChangeVisibility(props.name);
  }, [props.onChangeVisibility, props.name])
  return <div className="input-field" style={{width: props.width}}>
      <div style={{display: "flex", alignItems: "center"}}>
        <span className="input-label">{props.name}</span>
        {(props.onChangeVisibility ? <PropertyVisibility active={props.visible ?? false} onClick={onChangeVisibility}/> : null)}
          {!props.error ? null : <>
              <div className="w-1"></div>
              <Tooltip message={props.error}><WarningIcon size={20}/></Tooltip>
          </>}
      </div>
      <div className={`dropdown ${state.active ? "active": ""}`} tabIndex={-1} onBlur={onBlur} onFocus={onFocus}>
      <div className="selected">{state.current === '' ? <span>&nbsp;</span> : state.current}
        {
          props.onChange ?
          <div className="down-icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path style={{fill: 'var(--text-color)'}} d="M7 10l5 5 5-5z"/></svg>
          </div>
          : null
        }
      </div>
      <div className="dropdown-menu popout">
        {props.items.map((item, idx)=>{
          return <div key={item} className="dropdown-item" onClick={(e)=>{
            setState(curr => ({...curr, current: item}));
            props.onChange?.(item, idx);
            e.currentTarget.parentElement?.parentElement?.blur();
          }}>{item === '' ? <span>&nbsp;</span> : item}</div>
        })}
      </div>
    </div>
  </div>
}