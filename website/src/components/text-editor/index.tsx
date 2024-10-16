import * as React from "react"
import { ModalContext } from "../../common/modal-context";
import "./index.scss"

export function TextEditorModal(props: {title: string, value: string, onChange: (val: string)=>void}) {
  const openModal = React.useContext(ModalContext);
  const onChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>)=>{
    props.onChange(e.currentTarget.value);
  }, [props.onChange])
  return <div className="text-editor-modal">
    <div className="title">{props.title}</div>
    <div className="textarea-container">
      <textarea defaultValue={props.value} onInput={onChange} />
    </div>
  </div>
}