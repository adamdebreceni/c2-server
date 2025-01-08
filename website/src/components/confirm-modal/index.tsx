import * as React from "react"
import { ModalContext } from "../../common/modal-context";
import "./index.scss"
import { Fill } from "../fill/Fill";

export function ConfirmModal(props: {text: string, confirmLabel: string, type?: "DELETE"|"CREATE", onConfirm: ()=>void}) {
  const openModal = React.useContext(ModalContext);
  return <div className="confirm-modal">
    <div className="text">{props.text}</div>
    <div className="buttons">
      <Fill />
      <div className={`confirm ${props.type ?? "DELETE"}`} onClick={() => {props.onConfirm(); openModal(null as any)}}>{props.confirmLabel}</div>
      <div className="cancel" onClick={() => {openModal(null as any)}}>Cancel</div>
    </div>
  </div>
}