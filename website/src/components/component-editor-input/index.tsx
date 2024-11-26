import * as React from "react";
import { useContext } from "react";

import "./index.scss";
import { EditTextIcon } from "../../icons/edit-text";
import { TextEditorModal } from "../text-editor";
import { ModalContext } from "../../common/modal-context";
import { VisibilityIcon } from "../../icons/visibility";
import { PropertyVisibility } from "../property-visibility";

export function InputField(props: {name: string, width?: string, default?: string|null, validator?: (val: string)=>string|null, labelPaddingBottom?: number, onChange?: (value: string)=>void, visible?: boolean, onChangeVisibility?: (name: string)=>void}) {
  const openModal = useContext(ModalContext);
  const onChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>)=>{
    if (!props.onChange) return;
    props.onChange(e.currentTarget.value);
  }, [props.onChange]);
  const openTextEditor = React.useCallback(()=>{
    openModal(<TextEditorModal title={props.name} value={props.default ?? ""} onChange={props.onChange}/>);
  }, [props.onChange, props.default, props.name]);
  const onChangeVisibility = React.useCallback(()=>{
    if (!props.onChangeVisibility) return;
    props.onChangeVisibility(props.name);
  }, [props.onChangeVisibility, props.name]);
  const error = props.validator?.(props.default ?? "") ?? null;
  return <label className="input-field" style={{width: props.width}}>
    <div style={{display: "flex", alignItems: "center", paddingBottom: `${props.labelPaddingBottom ?? 5}px`}}>
      <span className="input-label">{props.name}</span>
      {(props.onChangeVisibility ? <PropertyVisibility active={props.visible ?? false} onClick={onChangeVisibility}/> : null)}
    </div>
    <div className="inner">
      <input className={error !== null ? "error" : ''} value={props.default ?? ""} onChange={onChange} readOnly={!props.onChange}/>
      {error ?
        <div className="input-error">{error}</div>
        : null
      }
      <EditTextIcon size={24} onClick={openTextEditor}/>
    </div>
  </label>
}