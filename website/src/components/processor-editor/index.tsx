import * as React from "react";
import { useContext } from "react";
import { FlowContext } from "../../common/flow-context";
import { ModalContext } from "../../common/modal-context";
import { NotificationContext } from "../../common/notification-context";
import { InputField } from "../component-editor-input";
import { Toggle } from "../component-editor-toggle";
import { CreateDynamicPropertyModal } from "../create-dynamic-property";
import { Dropdown } from "../dropdown";

import "./index.scss";

export function ProcessorEditor(props: {model: Processor, manifest: ProcessorManifest}) {
  const notif = useContext(NotificationContext);
  const flow_context = useContext(FlowContext);
  const openModal = useContext(ModalContext);
  const [model, setModel] = React.useState(props.model);
  console.log(`Properties: ${Object.keys(model.properties).join(', ')}`)
  React.useEffect(()=>{
    if (model === props.model) return;
    flow_context?.updateProcessor(model);
  }, [props.model, model, flow_context?.updateProcessor]);
  const onNewDynamicProperty = React.useCallback((prop: string) => {
    setModel(curr => {
      if (prop in curr.properties) {
        notif.emit(`Property '${prop}' already exists`, "error");
        return curr;
      }
      return {...curr, properties: {...curr.properties, [prop]: ""}}
    });
  }, []);
  const openModalCb = React.useCallback(()=>{
    openModal(<CreateDynamicPropertyModal onSubmit={onNewDynamicProperty}/>);
  }, []);
  return <div className="component-settings">
    <div className="type">{model.type}</div>
    <div className="section">
      <div className="section-title">General</div>
      <InputField name="NAME" width="100%" default={model.name} onChange={val=>setModel(curr => ({...curr, name: val}))}/>
      <InputField name="PENALTY DURATION" width="100%" default={model.penalty} onChange={val=>setModel(curr => ({...curr, penalty: val}))}/>
      <InputField name="YIELD DURATION" width="100%" default={model.yield} onChange={val => setModel(curr => ({...curr, yield: val}))}/>
    </div>
    <div className="section">
      <div className="section-title">Auto-terminated relationships</div>
      {
        Object.keys(model.autoterminatedRelationships).sort().map(rel=>{
          return <Toggle key={rel} name={rel} initial={model.autoterminatedRelationships[rel]} onChange={val => setModel(curr => ({...curr, autoterminatedRelationships: {...curr.autoterminatedRelationships, [rel]: val}}))}/>
        })
      }
    </div>
    <div className="section">
      <div className="section-title">Scheduling</div>
      <Dropdown name="STRATEGY" width="100%" initial={model.scheduling.strategy} items={["TIMER_DRIVEN", "EVENT_DRIVEN", "CRON_DRIVEN"]} onChange={val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, strategy: val as any}}))}/>
      <InputField name="MAX CONCURRENT TASKS" width="100%" default={`${model.scheduling.concurrentTasks}`} onChange={val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, concurrentTasks: val}}))}/>
      <InputField name="RUN SCHEDULE" width="100%" default={model.scheduling.runSchedule} onChange={val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, runSchedule: val}}))}/>
      <InputField name="RUN DURATION" width="100%" default={model.scheduling.runDuration} onChange={val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, runDuration: val}}))}/>
    </div>
    <div className="section">
      <div className="section-title">Properties</div>
      {
        Object.keys(model.properties).sort().map(prop_name => {
          if (!props.manifest.propertyDescriptors || !(prop_name in props.manifest.propertyDescriptors)) {
            // dynamic property
            return null;
          }
          const values = props.manifest.propertyDescriptors[prop_name].allowableValues;
          if (values) {
            return <Dropdown key={prop_name} name={prop_name} width="100%" items={values.map(val => val.value)} initial={model.properties[prop_name]} onChange={val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}}))}/>
          }
          return <InputField key={prop_name} name={prop_name} width="100%" default={model.properties[prop_name]} onChange={val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}}))}/>
        })
      }
    </div>
    {!props.manifest.supportsDynamicProperties ? null : 
    <div className="section">
      <div className="section-title">Dynamic Properties<span style={{flexGrow: 1}}/><div className="add-dynamic-property" onClick={openModalCb}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </div>
      </div>
      {
        Object.keys(model.properties).sort().map(prop_name => {
          if (props.manifest.propertyDescriptors && prop_name in props.manifest.propertyDescriptors) {
            // not dynamic property
            return null;
          }
          return <InputField key={prop_name} name={prop_name} width="100%" default={model.properties[prop_name]} onChange={val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}}))}/>
        })
      }
    </div>
    }
    <div className="close" onClick={()=>flow_context?.closeComponentEditor()}>
      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </div>
  </div>
}