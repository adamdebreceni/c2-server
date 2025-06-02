import * as React from "react";
import { ModalContext } from "../../../src/common/modal-context";
import { NotificationContext } from "../../../src/common/notification-context";
import { ServiceContext } from "../../../src/common/service-context";
import { LinkOffIcon } from "../../../src/icons/link-off";
import { LinkAddIcon } from "../../../src/icons/link-add";
import { ConfirmModal } from "../confirm-modal";

import "./index.scss"

export function LinkClassFlow(props: {agent: AgentLike}) {
  const services = React.useContext(ServiceContext);
  const notif = React.useContext(NotificationContext);
  const openModal = React.useContext(ModalContext);
  
  if (!props.agent.target_flow) {
    return null;
  }

  return <div className="link-class-flow" onClick={() => {
    openModal(<ConfirmModal text={`Are you sure you want to unlink the agent-specific flow, and use its class flow instead?`} confirmLabel="Link" type="CREATE" onConfirm={() => {
      services?.agents.linkClass(props.agent.id);
      notif.emit("Linked agent to its class flow", "success");
    }} />)
  }}>
    <LinkOffIcon size={20} />
    <LinkAddIcon size={20} />
  </div>
}