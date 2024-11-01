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
import { CreateDynamicRelationshipModal } from "../create-dynamic-relationship";
import { DeleteIcon } from "../../icons/delete";
import { Fill } from "../fill/Fill";
import { PropertyField } from "../property-input";
import { PropertyDropdown } from "../property-dropdown";
import { ConfirmModal } from "../confirm-modal";
import { ServiceContext } from "website/src/common/service-context";
import { Loader } from "../loader";

export function ProcessorEditor(props: {model: Processor, manifest: ProcessorManifest, errors: ErrorObject[], state?: ComponentExtendedState}) {
  const notif = useContext(NotificationContext);
  const flow_context = useContext(FlowContext);
  const openModal = useContext(ModalContext);
  const setModel = React.useMemo(()=>{
    return (fn: (curr: Processor)=>Processor) => flow_context!.updateProcessor(props.model.id, fn);
  }, [props.model.id, flow_context!.updateProcessor]);
  const model = props.model;
  const onNewDynamicProperty = React.useCallback((prop: string) => {
    setModel(curr => {
      if (prop in curr.properties) {
        notif.emit(`Property '${prop}' already exists`, "error");
        return curr;
      }
      return {...curr, properties: {...curr.properties, [prop]: ""}}
    });
  }, []);
  const onNewDynamicRelationship = React.useCallback((rel: string) => {
    setModel(curr => {
      if (rel in curr.autoterminatedRelationships) {
        notif.emit(`Relationship '${rel}' already exists`, "error");
        return curr;
      }
      return {...curr, autoterminatedRelationships: {...curr.autoterminatedRelationships, [rel]: false}}
    });
  }, []);
  const openCreateDynPropCb = React.useCallback(()=>{
    openModal(<CreateDynamicPropertyModal onSubmit={onNewDynamicProperty}/>);
  }, []);
  const openCreateDynRelCb = React.useCallback(()=>{
    openModal(<CreateDynamicRelationshipModal onSubmit={onNewDynamicRelationship}/>);
  }, []);
  const onChangeVisibility = React.useCallback((prop: string) => {
    setModel(curr => {
      const idx = curr.visibleProperties?.indexOf(prop) ?? -1;
      if (idx !== -1) {
        const new_props = curr.visibleProperties!.slice();
        new_props.splice(idx, 1);
        return {...curr, visibleProperties: new_props};
      }
      return {...curr, visibleProperties: [...(curr.visibleProperties ?? []), prop]}
    });
  }, []);
  const onClearState = React.useCallback(()=>{
    if (!props.state) {
      return;
    }
    openModal(<ConfirmModal confirmLabel="Delete" text={`Warning, you are about to irrevocably delete all state for the processor ${props.model.id} on this agent. Are you sure?`} onConfirm={()=>{
      flow_context?.clearProcessorState?.(props.model.id);
    }}/>)
  }, [!!props.state, props.model.id]);
  const [style_version, setStyleVersion] = React.useState<number>(4);
  return <div className="component-settings">
    <div className="type">{model.type}</div>
    <div className="uuid">{model.id}</div>
    {props.state ?
    <div className={`section processor-state version-${style_version}`}>
      <div className="section-title"><span onClick={()=>setStyleVersion(v => (v + 1) % 5)}>Processor State</span><Fill/><DeleteIcon size={20} onClick={onClearState}/></div>
        {
          typeof props.state === "string" ?
          <div className="state-loader-container"><div className="state-loader"></div></div>
          : Object.keys(props.state).map(key => {
            // return <InputField key={key} name={key} width="100%" default={props.state![key]}/>
            return <div key={key} className="component-state-entry">
              <div className="key">{key}</div>
              <div className="value">{(props.state as ComponentKVState)[key]}</div>
            </div>
          })
        }
      </div>
      : null
    }
    <div className="section">
      <div className="section-title">General</div>
      <InputField name="NAME" width="100%" default={model.name} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, name: val})) : undefined}/>
      <InputField name="PENALTY DURATION" width="100%" default={model.penalty} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, penalty: val})) : undefined}/>
      <InputField name="YIELD DURATION" width="100%" default={model.yield} onChange={flow_context?.editable ? val => setModel(curr => ({...curr, yield: val})) : undefined}/>
    </div>
    <div className="section">
      <div className="section-title">Auto-terminated relationships</div>
      {
        props.manifest.supportedRelationships.sort().map(rel=>{
          let err = props.errors.find(err => err.type === "RELATIONSHIP" && err.target === rel.name);
          return <Toggle key={rel.name} marginBottom="10px" name={rel.name} initial={model.autoterminatedRelationships[rel.name]} onChange={flow_context?.editable ? val => setModel(curr => ({...curr, autoterminatedRelationships: {...curr.autoterminatedRelationships, [rel.name]: val}})) : undefined} error={err?.message}/>
        })
      }
    </div>
    {!props.manifest.supportsDynamicRelationships ? null : 
    <div className="section">
      <div className="section-title">Dynamic Relationships<span style={{flexGrow: 1}}/>
        {
          flow_context?.editable ? 
          <div className="add-dynamic-relationship" onClick={openCreateDynRelCb}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div>
          : null
        }
      </div>
      {
        Object.keys(model.autoterminatedRelationships).sort().map(rel_name => {
          if (props.manifest.supportedRelationships.find(rel => rel.name === rel_name)) {
            // not dynamic property
            return null;
          }
          let err = props.errors.find(err => err.type === "RELATIONSHIP" && err.target === rel_name);
          return <div className="dynamic-relationship">
            <Toggle key={rel_name} name={rel_name} initial={model.autoterminatedRelationships[rel_name]} onChange={flow_context?.editable ? val => setModel(curr => ({...curr, autoterminatedRelationships: {...curr.autoterminatedRelationships, [rel_name]: val}})) : undefined} error={err?.message}/>
            <Fill/>
            {
              flow_context?.editable ? 
              <DeleteIcon size={24} onClick={() => {
                setModel(model => {
                  let new_autorels = {...model.autoterminatedRelationships};
                  delete new_autorels[rel_name];
                  return {...model, autoterminatedRelationships: new_autorels};
                })
              }}/>
              : null
            }
          </div>;
        })
      }
    </div>
    }
    <div className="section">
      <div className="section-title">Scheduling</div>
      <Dropdown name="STRATEGY" width="100%" initial={model.scheduling.strategy} items={["TIMER_DRIVEN", "EVENT_DRIVEN", "CRON_DRIVEN"]} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, strategy: val as any}})) : undefined}/>
      <InputField name="MAX CONCURRENT TASKS" width="100%" default={`${model.scheduling.concurrentTasks}`} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, concurrentTasks: val}})) : undefined}/>
      <InputField name="RUN SCHEDULE" width="100%" default={model.scheduling.runSchedule} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, runSchedule: val}})) : undefined}/>
      <InputField name="RUN DURATION" width="100%" default={model.scheduling.runDuration} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, runDuration: val}})) : undefined}/>
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
            return <PropertyDropdown key={prop_name} name={prop_name} width="100%" items={values.map(val => val.value)} initial={model.properties[prop_name]}
                onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}})) : undefined} visible={model.visibleProperties?.includes(prop_name) ?? false} onChangeVisibility={onChangeVisibility}/>
          }
          return <PropertyField key={prop_name} name={prop_name} width="100%" default={model.properties[prop_name]}
              onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}})) : undefined} visible={model.visibleProperties?.includes(prop_name) ?? false} onChangeVisibility={onChangeVisibility}/>
        })
      }
    </div>
    {!props.manifest.supportsDynamicProperties ? null : 
    <div className="section">
      <div className="section-title">Dynamic Properties<span style={{flexGrow: 1}}/>
        {
          flow_context?.editable ? 
          <div className="add-dynamic-property" onClick={openCreateDynPropCb}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div>
          : null
        }
      </div>
      {
        Object.keys(model.properties).sort().map(prop_name => {
          if (props.manifest.propertyDescriptors && prop_name in props.manifest.propertyDescriptors) {
            // not dynamic property
            return null;
          }
          return <div className="dynamic-property">
            <PropertyField key={prop_name} name={prop_name} width="100%" default={model.properties[prop_name]} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}})) : undefined}/>
            <Fill/>
            {
              flow_context?.editable ? 
              <DeleteIcon size={24} onClick={() => {
                setModel(model => {
                  let new_props = {...model.properties};
                  delete new_props[prop_name];
                  return {...model, properties: new_props};
                })
              }}/>
              : null
            }
          </div>
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