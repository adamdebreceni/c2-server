import * as React from 'react';
import { Fill } from '../fill/Fill';
import { NotificationContext } from '../../common/notification-context';
import { ModalContext } from '../../common/modal-context';
import { DeleteIcon } from '../../icons/delete';
import { CreateStringModal } from '../create-string-modal';
import { InputField } from '../component-editor-input';

import "./index.scss"
import { CopyIcon } from '../../icons/copy';
import { PasteIcon } from '../../icons/paste';

export function isSpecialInputField(type: string, name: string) {
  return type.endsWith("AiProcessor") && name === "Examples";
}

type OutputFlowFileData = FlowFileData & {"relationship": string}

type ExamplesPropertyValue = {"input": FlowFileData, "outputs": OutputFlowFileData[]}[]

export function SpecialInputField(props: {name: string, width?: string, default?: string|null, labelPaddingBottom?: number, onChange?: (value: string)=>void, visible?: boolean, onChangeVisibility?: (name: string)=>void}) {
  const notif = React.useContext(NotificationContext);
  let model: ExamplesPropertyValue = [];
  try {
    model = JSON.parse(props.default ?? "[]");
  } catch (e) {
    notif.emit("Failed to parse json property", "error");
  }
  const onChange = (()=>{
    if (!props.onChange) return undefined;
    return (fn: (curr: ExamplesPropertyValue)=>ExamplesPropertyValue)=>{
      props.onChange!(JSON.stringify(fn(model)));
    };
  })();
  return <div className="section">
    <div className="section-title">Examples<Fill/>{
      onChange ? 
      <div className="add-ff-attribute" onClick={()=>{
        onChange!(curr => {
          const new_state = curr.slice();
          new_state.push({"input": {"attributes": {}, "content": ""}, "outputs": []});
          return new_state;
        });
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      </div>
      : null
    }</div>
    {
      model.map((example, idx) => {
        return <div className="transform-example">
          <div className="header">Example-{idx + 1}<div className="copy-ff" onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(example)).then(()=>{
              notif.emit("Copied example to clipboard", "success");
            }).catch(()=>{
              notif.emit("Failed to copy example", "error");
            });
          }}><CopyIcon size={20}/></div>{onChange ? <><div className="paste-ff" onClick={() => {
            navigator.clipboard.readText().then((example_str) => {
              const new_example = JSON.parse(example_str);
              onChange!(curr=>curr.map((ex, ex_idx)=>ex_idx === idx ? {input: {attributes: {}, content: ''}, outputs: [], ...new_example} : ex));
            }).catch(()=>{
              notif.emit("Failed to paste example", "error");
            });
          }}><PasteIcon size={20}/></div><Fill/><div className="add-ff-attribute" onClick={()=>{
              onChange!(curr => {
                return curr.map((ex, ex_idx) => {
                  if (ex_idx !== idx) return ex;
                  return {...ex, outputs: [...ex.outputs, {attributes: {}, content: "", relationship: ''}]}
                });
              });
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </div>
            <DeleteIcon size={24} onClick={() => {
              onChange!(curr => curr.filter((ex, ex_idx) => ex_idx !== idx));
            }}/></>
            : null
          }</div>
          <div className="input">
            <FlowFileDataView model={example.input} onChange={onChange ? (fn: (curr: FlowFileData)=>FlowFileData)=>{
              onChange(curr => curr.map((ex, ex_idx) => {
                if (ex_idx !== idx) return ex;
                return {...ex, input: fn(ex.input)};
              }))
            }: undefined} />
          </div>
          <div className="outputs">
            {
              example.outputs.map((out, out_idx) => <OutputFlowFileView key={out_idx} out_idx={out_idx} model={out} onChange={onChange ? (fn: (curr: OutputFlowFileData)=>OutputFlowFileData|undefined)=>{
                onChange(curr => curr.map((ex, ex_idx) => {
                  if (ex_idx !== idx) return ex;
                  const prev_output = ex.outputs[out_idx];
                  if (!prev_output) return ex;
                  const new_output = fn(prev_output);
                  if (!new_output) {
                    return {...ex, outputs: ex.outputs.filter((out, idx) => idx !== out_idx)};
                  }
                  return {...ex, outputs: ex.outputs.map((out, idx) => {
                    if (idx !== out_idx) return out;
                    return new_output;
                  })};
                }))
              }: undefined} />)
            }
          </div>
        </div>
      })
    }
  </div>
}

function FlowFileDataView(props: {model: FlowFileData|OutputFlowFileData, out_idx?: number, onChange?: (fn: (curr: FlowFileData)=>FlowFileData)=>void}) {
  const openModal = React.useContext(ModalContext);
  const notif = React.useContext(NotificationContext);
  return <div className="ff-data">
    <div className="ff-attributes">
      <div className="title">{props.out_idx !== undefined ? `Output ${props.out_idx + 1}` : "Input"}<div className="copy-ff" onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(props.model)).then(()=>{
              notif.emit("Copied flow file to clipboard", "success");
            }).catch(()=>{
              notif.emit("Failed to copy flow file", "error");
            });
          }}><CopyIcon size={20}/></div>
        {
          props.onChange ?
          <><div className="paste-ff" onClick={() => {
            navigator.clipboard.readText().then((ff_str) => {
              const new_ff = {attributes: {}, content: '', relationship: '', ...JSON.parse(ff_str)};
              if (props.out_idx === undefined) {
                delete new_ff['relationship'];
              }
              props.onChange!(curr => new_ff);
            }).catch(()=>{
              notif.emit("Failed to paste flow file", "error");
            });
          }}><PasteIcon size={20}/></div><Fill/><div className="add-ff-attribute" onClick={()=>{
              openModal(<CreateStringModal text={`Add ${props.out_idx !== undefined ? 'Output' : 'Input'} Flow File Attribute`} onSubmit={(key) => {
                props.onChange!((curr) => ({...curr, attributes: {...curr.attributes, [key]: ''}}))
              }}/>);
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div>{
            "relationship" in props.model ?
            <DeleteIcon size={24} onClick={() => {
              props.onChange!(curr => undefined as any);
            }}/>
            : null
          }</>
          : null
        }
      </div>
      {Object.entries(props.model.attributes).map(([attr_name, attr_val]) => {
        return <div className="ff-attribute-entry">
          <InputField name={attr_name} width="100%" default={attr_val} onChange={props.onChange ? (val=>props.onChange!(curr => {
            return {...curr, attributes: {...curr.attributes, [attr_name]: val}};
          })) : undefined}/>
          {
            props.onChange ? 
            <>
              <Fill/>
              <DeleteIcon size={24} onClick={() => {
                props.onChange!(curr => {
                  const new_attrs = {...curr.attributes};
                  delete new_attrs[attr_name];
                  return {...curr, attributes: new_attrs};
                })
              }}/>
            </>
            : null
          }
        </div>;
      })}
    </div>


    <div className="ff-content">
      <div className="title">Content</div>
      <InputField name="" width="100%" default={props.model.content} onChange={props.onChange ? (val=>props.onChange!(curr => {
          return {...curr, content: val};
      })) : undefined}/>
    </div>
    {
      "relationship" in props.model ?
      <div className="ff-relationship">
        <div className="title">Relationship</div>
        <InputField name="" width="100%" default={props.model.relationship} onChange={props.onChange ? (val=>props.onChange!(curr => {
            return {...curr, relationship: val};
        })) : undefined}/>
      </div>
      : null
    }
  </div>;
}

function OutputFlowFileView(props: {model: OutputFlowFileData, out_idx: number, onChange?: (fn: (curr: OutputFlowFileData)=>OutputFlowFileData|undefined)=>void}) {
  return <div className="output-ff">
    <div className="header"></div>
    <FlowFileDataView model={props.model} out_idx={props.out_idx} onChange={props.onChange as any} />
  </div>
}
