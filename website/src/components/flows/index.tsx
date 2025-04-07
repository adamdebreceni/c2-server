import {useContext, useEffect, useState} from "react";
import * as React from "react";
import {ServiceContext} from "../../common/service-context";
import {FlowPreview} from "../flow-preview";

import "./index.scss";
import {ImportModal} from "../import-modal";
import {ModalContext} from "../../common/modal-context";

export function Flows() {
  const services = useContext(ServiceContext);
  const openModal = useContext(ModalContext);
  const [flows, setFlows] = useState<FlowLike[]>([]);
  useEffect(() => {
    let isMounted = true;
    services!.flows.fetchAll().then(flows => {
      if (!isMounted) return;
      setFlows(flows);
    })
    return () => {
      isMounted = false
    }
  }, [])
  
  return <div className="flow-list">
    <div className="open-import"
      onClick={() => openModal(<ImportModal onImport={async (class_str, flow_str) =>
      {
        await services!.flows.import(class_str, flow_str);
        const updatedFlows = await services!.flows.fetchAll();
        setFlows(updatedFlows);
      }} />)}>
      <span className="label">Import</span>
    </div>
    {flows.map(flow => <FlowPreview key={flow.id} value={flow}/>)}
    </div>
  }