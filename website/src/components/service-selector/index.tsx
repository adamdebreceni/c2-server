import * as React from "react";
import { FlowContext } from "../../common/flow-context";

import "./index.scss";

export function ServiceSelector(props: {services: {id: string, name: string, description: string}[]}) {
  const flow_context = React.useContext(FlowContext);
  return <div className="service-selector">
    <div className="title">Services</div>
    <div className="service-list">
      <div className="service-list-inner">{
        props.services.sort((a, b) => a.name < b.name ? -1 : (a.name === b.name ? 0 : 1))
        .map(service => <ServiceListItem key={service.id} id={service.id} name={service.name} description={service.description} />)
      }</div>
    </div>
    <div className="footer">
      <div className="cancel" onClick={()=>flow_context?.closeNewService(null)}>CANCEL</div>
    </div>
  </div>
}

function ServiceListItem(props: {id: string, name: string, description: string}) {
  const flow_context = React.useContext(FlowContext);
  const [state, setState] = React.useState(false);
  const toggleState = React.useCallback(()=>{
    setState(st => !st);
  }, [])
  return <div className="service-list-item">
    <div className="header" onClick={toggleState}>
      { state ? <div className="close description-icon">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
        </div> :
        <div className="open description-icon">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
        </div>
      }
      <div className="name">{props.name}</div>
      <div className="fill"/>
      <div className="add" onClick={()=>flow_context?.closeNewService(props.id)}>Add</div>
    </div>
    {
      state ? <div className="description">{props.description}</div> : null
    }
  </div>;
}