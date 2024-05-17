import * as React from "react";
import { useState } from "react";

import "./index.scss";

export function Dropdown(props: {name: string, items: string[], initial?: string|null, onChange?: (item: string)=>void, width?: string}) {
  const [state, setState] = useState({current: props.initial ?? props.items[0], active: false});
  const onBlur = React.useCallback(()=>{
    setState(curr => ({...curr, active: false}));
  }, [])
  const onFocus = React.useCallback(()=>{
    setState(curr => ({...curr, active: true}));
  }, [])
  return <div className="input-field" style={{width: props.width}}>
      <span className="input-label">{props.name}</span><br/>
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