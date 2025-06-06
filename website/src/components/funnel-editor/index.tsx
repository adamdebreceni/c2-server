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

export function FunnelEditor(props: {model: Funnel}) {
  const flow_context = useContext(FlowContext);
  const setModel = React.useMemo(()=>{
    return (fn: (curr: Funnel)=>Funnel) => flow_context!.updateFunnel(props.model.id, fn);
  }, [props.model.id, flow_context!.updateFunnel]);
  return <div className="component-settings">
    <div className="component-header">
      <div className="type">Funnel</div>
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
    </div>
  </div>
}