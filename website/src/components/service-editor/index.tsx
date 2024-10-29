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

export function ServiceEditor(props: {model: MiNiFiService, manifest: ControllerServiceManifest}) {
  const notif = useContext(NotificationContext);
  const flow_context = useContext(FlowContext);
  const openModal = useContext(ModalContext);
  const setModel = React.useMemo(()=>{
    return (fn: (curr: MiNiFiService)=>MiNiFiService) => flow_context!.updateService(props.model.id, fn);
  }, [props.model.id, flow_context!.updateService]);
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
  const openModalCb = React.useCallback(()=>{
    openModal(<CreateDynamicPropertyModal onSubmit={onNewDynamicProperty}/>);
  }, []);
  return <div className="component-settings">
    <div className="type">{model.type}</div>
    <div className="uuid">{model.id}</div>
    <div className="section">
      <div className="section-title">General</div>
      <InputField name="NAME" width="100%" default={model.name} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, name: val})) : undefined}/>
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
            return <Dropdown key={prop_name} name={prop_name} width="100%" items={values.map(val => val.value)} initial={model.properties[prop_name]} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}})) : undefined}/>
          }
          return <InputField key={prop_name} name={prop_name} width="100%" default={model.properties[prop_name]} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}})) : undefined}/>
        })
      }
    </div>
    {!props.manifest.supportsDynamicProperties ? null : 
    <div className="section">
      <div className="section-title">Dynamic Properties<span style={{flexGrow: 1}}/>
        {
          flow_context?.editable ? 
          <div className="add-dynamic-property" onClick={openModalCb}>
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
          return <InputField key={prop_name} name={prop_name} width="100%" default={model.properties[prop_name]} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}})) : undefined}/>
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