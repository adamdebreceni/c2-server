import * as React from "react";
import { useContext } from "react";
import { FlowContext } from "../../common/flow-context";
import { ModalContext } from "../../common/modal-context";
import { NotificationContext } from "../../common/notification-context";
import { InputField } from "../component-editor-input";
import { Toggle } from "../component-editor-toggle";
import { Dropdown } from "../dropdown";

import "./index.scss";
import { CreateStringModal } from "../create-string-modal";
import { Fill } from "../fill/Fill";
import { DeleteIcon } from "../../icons/delete";

export function ParameterContextEditor(props: {model: ParameterContext}) {
  const flow_context = useContext(FlowContext);
  const openModal = useContext(ModalContext);
  const setModel = React.useMemo(()=>{
    return (fn: (curr: ParameterContext)=>ParameterContext) => flow_context!.updateParameterContext(props.model.id, fn);
  }, [props.model.id, flow_context!.updateParameterContext]);
  const setParam = React.useCallback((idx: number, fn: (curr: ParameterContextParam)=>ParameterContextParam|undefined)=>{
    setModel(ctx => {
      const param = ctx.parameters[idx];
      if (!param) return ctx;
      const new_param = fn(param);
      if (!new_param) {
        return {...ctx, parameters: ctx.parameters.filter((p, param_idx) => param_idx !== idx)};
      }
      return {...ctx, parameters: ctx.parameters.map((param, param_idx) => param_idx !== idx ? param : new_param)}
    })
  }, [setModel])
  const openCreateParameter = React.useCallback(()=>{
    openModal(<CreateStringModal text="Add Parameter" onSubmit={(name: string)=>{
      setModel(curr => ({...curr, parameters: [...curr.parameters, {name: name, sensitive: false, value: '', description: ''}]}))
    }}/>);
  }, [setModel]);
  return <div className="component-settings parameter-context-editor">
    <div className="component-header">
      <div className="type">Parameter Context</div>
      <div className="uuid">{props.model.id}</div>
      <div className="close" onClick={()=>flow_context?.closeComponentEditor()}>
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </div>
    </div>
    <div className="component-content">
      <div className="section">
        <div className="section-title">General</div>
        <InputField name="NAME" width="100%" default={props.model.name} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, name: val})) : undefined}/>
      </div>
      <div className="section">
        <div className="section-title">Parameters<Fill/>{
              flow_context?.editable ? 
              <div className="add-dynamic-property" onClick={openCreateParameter}>
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              </div>
              : null
            }
        </div>
        {
          props.model.parameters.map((param, idx) => {
            return <div className="parameter">
              <div className="header">{param.name}<Fill/>
                <DeleteIcon size={20} onClick={(e)=>{
                    setParam(idx, ()=>undefined);
                  }} />
              </div>
              <InputField name="Value" width="100%" default={param.value} onChange={flow_context?.editable ? val=>setParam(idx, curr => ({...curr, value: val})) : undefined}/>
              <InputField name="Description" width="100%" default={param.description} onChange={flow_context?.editable ? val=>setParam(idx, curr => ({...curr, description: val})) : undefined}/>
              <Toggle name="Sensitive" initial={param.sensitive} onChange={val => setParam(idx, curr => ({...curr, sensitive: val}))}/>
            </div>
          })
        }
      </div>
    </div>
  </div>
}