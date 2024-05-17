import * as React from "react";

import "./index.scss";

export function InputField(props: {name: string, width?: string, default?: string|null, labelPaddingBottom?: number, onChange?: (value: string)=>void}) {
  const onChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>)=>{
    props.onChange?.(e.currentTarget.value);
  }, [props.onChange])
  return <label className="input-field" style={{width: props.width}}>
    <span className="input-label" style={{paddingBottom: `${props.labelPaddingBottom ?? 5}px`}}>{props.name}</span><br/>
    <input defaultValue={props.default ?? ""} onChange={onChange}/>
  </label>
}