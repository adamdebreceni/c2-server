import * as React from "react";
import { useParams } from "react-router";
import { ServiceContext } from "../../common/service-context";
import { FlowEditor } from "../flow-editor";

export function FlowView() {
  const [flow, setFlow] = React.useState<FlowObject|null>(null);
  const flowId = useParams<any>()["id"];
  const services = React.useContext(ServiceContext);
  React.useEffect(()=>{
    let isMounted = true;
    services!.flows.fetch(flowId).then(flow => {
      if (!isMounted) return;
      if (flow) {
        setFlow(flow);
      }
    })
    return ()=>{isMounted = false;}
  }, [flowId]);
  // React.useEffect(()=>{
  //   const wheelHandler = (e: WheelEvent)=>{
  //     e.preventDefault();
  //   }
  //   document.addEventListener("wheel", wheelHandler, {passive: false});
  //   return ()=>{
  //     document.removeEventListener("wheel", wheelHandler);
  //   }
  // })
  if (!flow) return null;

  return <FlowEditor id={flowId} flow={flow}/>
}