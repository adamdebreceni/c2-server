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
import { ComponentProperties } from "../component-properties";

export function ServiceEditor(props: {model: MiNiFiService, manifest: ControllerServiceManifest, errors: ErrorObject[], minifi_services?: MiNiFiService[], manifest_services?: ControllerServiceManifest[]}) {
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
      return {...curr, properties: {...curr.properties, [prop]: {value: "", type: "custom"}}}
    });
  }, []);
  const openModalCb = React.useCallback(()=>{
    openModal(<CreateStringModal text="Add Dynamic Property" onSubmit={onNewDynamicProperty}/>);
  }, []);
  return <div className="component-settings">
    <div className="component-header">
      <div className="type">{model.type}</div>
      <div className="uuid">{model.id}</div>
      <div className="close" onClick={()=>flow_context?.closeComponentEditor()}>
        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </div>
    </div>
    <div className="component-content">

      <div className="section">
        <div className="section-title">General</div>
        <InputField name="NAME" width="100%" default={model.name} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, name: val})) : undefined}/>
      </div>
      <ComponentProperties model={model} setModel={setModel} manifest={props.manifest} minifi_services={props.minifi_services} manifest_services={props.manifest_services} errors={props.errors} />
    </div>
  </div>
}