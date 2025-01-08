import * as React from "react";
import { useNavigate } from "react-router";
import { NotificationContext } from "../../common/notification-context";
import { ModalContext } from "../../common/modal-context";
import { ServiceContext } from "../../common/service-context";
import { InstallExtensionModal } from "../extension-install";

import "./index.scss";
import { AgentMenu } from "../agent-menu";
import { ConfirmModal } from "../confirm-modal";

export function Agent(props: {value: AgentLike}) {
  const services = React.useContext(ServiceContext);
  const navigate = useNavigate();
  const notif = React.useContext(NotificationContext);
  const openModal = React.useContext(ModalContext);
  const goToAgent = React.useCallback(() => {
    navigate(`/agent/${props.value.id}`);
  }, [props.value.id]);
  return <div className="agent">
      <div className="header">
        <div className="id" onClick={goToAgent}>{props.value.id}</div>
        <div className="class">{props.value.class}</div>
        <div className={`last-heartbeat ${Date.now() - (props.value.last_heartbeat?.getTime() ?? 0) < 10000 ? "alive" : ""}`}>{props.value.last_heartbeat?.toLocaleString()}</div>
        <div className="fill"/>
        <div className="settings" tabIndex={-1}>
          <div className="icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </div>
          <AgentMenu id={props.value.id} />
        </div>
      </div>
      <div className="flow" onClick={()=>{
        if (props.value.flow) {
          services?.flows.fetch(props.value.flow).then(flow=>{
            if (!flow) {
              openModal(<ConfirmModal confirmLabel="Create" type="CREATE" text={`Flow ${props.value.flow} is not available on the server, would you like to create a new flow?`} onConfirm={()=>{
                services?.flows.create({agent: props.value.id}).then(id => {
                  navigate(`/flow/${id}`);
                })
              }}/>)
            } else {
              navigate(`/agent/${props.value.id}/flow`)
            }
          })
        } else {
          services?.flows.create({agent: props.value.id}).then(id => {
            navigate(`/flow/${id}`);
          })
        }
      }}>{props.value.flow ?? "<using class flow>"}</div>
  </div>
}