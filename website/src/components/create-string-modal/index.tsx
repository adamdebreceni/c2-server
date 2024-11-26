import * as React from "react"
import { ModalContext } from "../../common/modal-context";
import "./index.scss"

export function CreateStringModal(props: {text: string, onSubmit: (val: string)=>void}) {
  const openModal = React.useContext(ModalContext);
  const [prop_name, setPropName] = React.useState<string>("");
  const onChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>)=>{
    setPropName(e.currentTarget.value);
  }, [prop_name])
  return <div className="create-string">
    <div className="title">{props.text}</div>
    <input defaultValue={prop_name} onChange={onChange} />
    <div className="ok" onClick={() => {props.onSubmit(prop_name); openModal(null as any)}}>Create</div>
  </div>
}