import { useContext, useEffect, useState } from "react";
import * as React from "react";
import { ServiceContext } from "../../common/service-context";
import { FlowPreview } from "../flow-preview";

import "./index.scss";

export function Flows() {
  const services = useContext(ServiceContext);
  const [flows, setFlows] = useState<FlowLike[]>([]);
  useEffect(()=>{
    let isMounted = true;
    services!.flows.fetchAll().then(flows => {
      if (!isMounted) return;
      setFlows(flows);
    })
    return ()=>{isMounted = false}
  }, [])
  return <div className="flow-list">
    {flows.map(flow => <FlowPreview key={flow.id} value={flow}/>)}
  </div>
}