import * as React from "react";
import "./index.scss"
import { ModalContext } from "../../common/modal-context"

export function ModalLayer(props: {children: React.ReactNode[]|React.ReactNode}) {
  const [modal, setModal] = React.useState<React.ReactElement|null>(null);
  const open = React.useCallback((modal: React.ReactElement)=>{
    setModal(modal);
  }, []);
  const close = React.useCallback(()=>{
    setModal(null)
  }, [])
  return <ModalContext.Provider value={open}>
    {(modal === null) ? null :
      <div className="modal-container">
        <div className="content-overlay" onClick={close}/>
        <div className="modal">{modal}</div>
      </div>
    }
    {props.children}
  </ModalContext.Provider>
}