import * as React from "react";
import { useContext } from "react";
import { FlowContext } from "../../common/flow-context";
import { InputField } from "../component-editor-input";
import { Toggle } from "../component-editor-toggle";
import "./index.scss"

export function ConnectionEditor(props: {model: Connection}) {
  const flow_context = useContext(FlowContext);
  const [model, setModel] = React.useState(props.model);
  React.useEffect(()=>{
    if (model === props.model) return;
    flow_context?.updateConnection(model);
  }, [model, flow_context?.updateProcessor]);
  return <div className="component-settings">
    <div className="section">
      <div className="section-title">General</div>
      {props.model.errors.map(err => <div key={err} className="connection-error">{err}</div>)}
      <InputField name="NAME" width="100%" default={props.model.name} onChange={val=>setModel(curr => ({...curr, name: val}))}/>
      <InputField name="FLOWFILE EXPIRATION" width="100%" default={props.model.flowFileExpiration} onChange={val=>setModel(curr => ({...curr, flowFileExpiration: val}))}/>
      <InputField name="BACK PRESSURE COUNT THRESHOLD" width="100%" default={props.model.backpressureThreshold.count} onChange={val => setModel(curr => ({...curr, backpressureThreshold: {...curr.backpressureThreshold, count: val}}))}/>
      <InputField name="BACK PRESSURE SIZE THRESHOLD" width="100%" default={props.model.backpressureThreshold.size} onChange={val => setModel(curr => ({...curr, backpressureThreshold: {...curr.backpressureThreshold, size: val}}))}/>
      <InputField name="SWAP THRESHOLD" width="100%" default={props.model.swapThreshold} onChange={val => setModel(curr => ({...curr, swapThreshold: val}))}/>
    </div>
    <div className="section">
      <div className="section-title">Source relationships</div>
      {
        Object.keys(props.model.sourceRelationships).sort().map(rel=>{
          return <Toggle key={rel} marginBottom="10px" name={rel} initial={props.model.sourceRelationships[rel]} onChange={val => setModel(curr => ({...curr, sourceRelationships: {...curr.sourceRelationships, [rel]: val}}))} />
        })
      }
    </div>
    <div className="section">
      <div className="section-title">Flow File Attributes</div>
      {
        props.model.attributes.map(attr=>{
          return <div key={attr} className="flowfile-attribute">{attr}</div>
        })
      }
    </div>
    <div className="close" onClick={()=>flow_context?.closeComponentEditor()}>
      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </div>
  </div>
}