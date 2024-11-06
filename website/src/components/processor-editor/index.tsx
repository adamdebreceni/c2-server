import * as React from "react";
import { useContext } from "react";
import { FlowContext } from "../../common/flow-context";
import { ModalContext } from "../../common/modal-context";
import { NotificationContext } from "../../common/notification-context";
import { InputField } from "../component-editor-input";
import { Toggle } from "../component-editor-toggle";
import { Dropdown } from "../dropdown";

import "./index.scss";
import { DeleteIcon } from "../../icons/delete";
import { Fill } from "../fill/Fill";
import { PropertyField } from "../property-input";
import { PropertyDropdown } from "../property-dropdown";
import { ConfirmModal } from "../confirm-modal";
import { ServiceContext } from "../../common/service-context";
import { Loader } from "../loader";
import { CreateStringModal } from "../create-string-modal";
import * as uuid from 'uuid';
import { ArrowRightIcon } from "../../icons/arrow-right";
import { CopyIcon } from "../../icons/copy";
import { PasteIcon } from "../../icons/paste";
import { EditIcon } from "../../icons/edit";
import { isSpecialInputField, SpecialInputField } from "../special-input";

type ActiveRunInfo = {runIdx: number, triggerIdx: number|null}|null;

export function ProcessorEditor(props: {model: Processor, manifest: ProcessorManifest, errors: ErrorObject[], state?: ComponentExtendedState, runs?: ProcessorRun[]|undefined}) {
  const notif = useContext(NotificationContext);
  const flow_context = useContext(FlowContext);
  const openModal = useContext(ModalContext);
  const services = useContext(ServiceContext);
  const triggerRun = React.useCallback((args: RunInput): Promise<RunResult> => {
    return services!.agents.triggerComponent(flow_context!.agentId!, props.model.id, args)
  }, [services, props.model.id]);
  const setModel = React.useMemo(()=>{
    return (fn: (curr: Processor)=>Processor) => flow_context!.updateProcessor(props.model.id, fn);
  }, [props.model.id, flow_context!.updateProcessor]);
  const updateRun = React.useMemo(()=>{
    return (runId: Uuid, fn: (curr: ProcessorRun)=>ProcessorRun|ProcessorRun[]|undefined) => flow_context!.updateRun!(props.model.id, runId, fn);
  }, [props.model.id, flow_context!.updateRun]);
  const updateTrigger = React.useMemo(()=>{
    return (runId: Uuid, triggerIdx: number, fn: (curr: TriggerInfo)=>TriggerInfo|undefined) => {
      updateRun(runId, (curr_run: ProcessorRun) => {
        const prev_trigger = curr_run.input.triggers[triggerIdx];
        if (prev_trigger) {
          const new_trigger = fn(prev_trigger);
          if (!new_trigger) {
            return {...curr_run, input: {...curr_run.input, triggers: curr_run.input.triggers.filter((trigger, idx) => idx !== triggerIdx)}};
          }
          return {...curr_run, input: {...curr_run.input, triggers: curr_run.input.triggers.map((trigger, idx) => idx === triggerIdx ? new_trigger : trigger)}};
        }
        return curr_run;
      });
    }
  }, [updateRun]);
  const updateTriggerFF = React.useMemo(()=>{
    return (runId: Uuid, triggerIdx: number, ffIdx: number, fn: (curr: FlowFileData)=>FlowFileData|undefined) => {
      updateTrigger(runId, triggerIdx, (trigger: TriggerInfo) => {
        const prev_ff = trigger[ffIdx];
        if (prev_ff) {
          const new_ff = fn(prev_ff);
          if (!new_ff) {
            return trigger.filter((ff, idx) => idx !== ffIdx);
          }
          return trigger.map((ff, idx) => idx === ffIdx ? new_ff : ff);
        }
        return trigger;
      });
    }
  }, [updateTrigger]);
  const model = props.model;
  const onNewDynamicProperty = React.useCallback((prop: string) => {
    setModel(curr => {
      if (prop in curr.properties) {
        notif.emit(`Property '${prop}' already exists`, "error");
        return curr;
      }
      return {...curr, properties: {...curr.properties, [prop]: ""}}
    });
  }, []);
  const onNewDynamicRelationship = React.useCallback((rel: string) => {
    setModel(curr => {
      if (rel in curr.autoterminatedRelationships) {
        notif.emit(`Relationship '${rel}' already exists`, "error");
        return curr;
      }
      return {...curr, autoterminatedRelationships: {...curr.autoterminatedRelationships, [rel]: false}}
    });
  }, []);
  const openCreateDynPropCb = React.useCallback(()=>{
    openModal(<CreateStringModal text="Add Dynamic Property" onSubmit={onNewDynamicProperty}/>);
  }, []);
  const openCreateDynRelCb = React.useCallback(()=>{
    openModal(<CreateStringModal text="Add Dynamic Relationship" onSubmit={onNewDynamicRelationship}/>);
  }, []);
  const onChangeVisibility = React.useCallback((prop: string) => {
    setModel(curr => {
      const idx = curr.visibleProperties?.indexOf(prop) ?? -1;
      if (idx !== -1) {
        const new_props = curr.visibleProperties!.slice();
        new_props.splice(idx, 1);
        return {...curr, visibleProperties: new_props};
      }
      return {...curr, visibleProperties: [...(curr.visibleProperties ?? []), prop]}
    });
  }, []);
  const onClearState = React.useCallback(()=>{
    if (!props.state) {
      return;
    }
    openModal(<ConfirmModal confirmLabel="Delete" text={`Warning, you are about to irrevocably delete all state for the processor ${props.model.id} on this agent. Are you sure?`} onConfirm={()=>{
      flow_context?.clearProcessorState?.(props.model.id);
    }}/>)
  }, [!!props.state, props.model.id]);
  const [activeTab, setActiveTab] = React.useState<"configuration"|"state"|"runs">("configuration");
  const [activeRunInfo, setActiveRunInfo] = React.useState<ActiveRunInfo>(null);
  const [style_version, setStyleVersion] = React.useState<number>(4);
  return <div className="component-settings">
    <div className="type">{model.type}</div>
    <div className="uuid">{model.id}</div>
    {
      flow_context?.agentId !== undefined ? 
      <div className="tab-headers">
        <div className={`tab-header ${activeTab === "configuration" ? 'active': ''}`} onClick={()=>setActiveTab("configuration")}>Config</div>
        <div className={`tab-header ${activeTab === "state" ? 'active': ''}`} onClick={()=>setActiveTab("state")}>State</div>
        <div className={`tab-header ${activeTab === "runs" ? 'active': ''}`} onClick={()=>{setActiveTab("runs"); setActiveRunInfo(null)}}>Runs</div>
      </div>
      : null
    }
    <div className={`tab ${activeTab === "state" ? 'active': ''}`}>
      {props.state ?
      <div className={`section processor-state version-${style_version}`}>
        <div className="section-title"><span onClick={()=>setStyleVersion(v => (v + 1) % 5)}>Processor State</span>
          <div className="copy-state" onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(props.state)).then(()=>{
              notif.emit("Copied state to clipboard", "success");
            }).catch(()=>{
              notif.emit("Failed to copy state", "error");
            });
          }}><CopyIcon size={20}/></div><Fill/>
          <DeleteIcon size={20} onClick={onClearState}/></div>
          {
            typeof props.state === "string" ?
            <div className="state-loader-container"><div className="state-loader"></div></div>
            : Object.keys(props.state).map(key => {
              // return <InputField key={key} name={key} width="100%" default={props.state![key]}/>
              return <div key={key} className="component-state-entry">
                <div className="key">{key}</div>
                <div className="value">{(props.state as ComponentKVState)[key]}</div>
              </div>
            })
          }
        </div>
        : null
      }
    </div>
    <div className={`tab ${activeTab === "configuration" ? 'active': ''}`}>
      <div className="section">
        <div className="section-title">General</div>
        <InputField name="NAME" width="100%" default={model.name} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, name: val})) : undefined}/>
        <InputField name="PENALTY DURATION" width="100%" default={model.penalty} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, penalty: val})) : undefined}/>
        <InputField name="YIELD DURATION" width="100%" default={model.yield} onChange={flow_context?.editable ? val => setModel(curr => ({...curr, yield: val})) : undefined}/>
      </div>
      <div className="section">
        <div className="section-title">Auto-terminated relationships</div>
        {
          props.manifest.supportedRelationships.sort().map(rel=>{
            let err = props.errors.find(err => err.type === "RELATIONSHIP" && err.target === rel.name);
            return <Toggle key={rel.name} marginBottom="10px" name={rel.name} initial={model.autoterminatedRelationships[rel.name]} onChange={flow_context?.editable ? val => setModel(curr => ({...curr, autoterminatedRelationships: {...curr.autoterminatedRelationships, [rel.name]: val}})) : undefined} error={err?.message}/>
          })
        }
      </div>
      {!props.manifest.supportsDynamicRelationships ? null : 
      <div className="section">
        <div className="section-title">Dynamic Relationships<span style={{flexGrow: 1}}/>
          {
            flow_context?.editable ? 
            <div className="add-dynamic-relationship" onClick={openCreateDynRelCb}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </div>
            : null
          }
        </div>
        {
          Object.keys(model.autoterminatedRelationships).sort().map(rel_name => {
            if (props.manifest.supportedRelationships.find(rel => rel.name === rel_name)) {
              // not dynamic property
              return null;
            }
            let err = props.errors.find(err => err.type === "RELATIONSHIP" && err.target === rel_name);
            return <div className="dynamic-relationship">
              <Toggle key={rel_name} name={rel_name} initial={model.autoterminatedRelationships[rel_name]} onChange={flow_context?.editable ? val => setModel(curr => ({...curr, autoterminatedRelationships: {...curr.autoterminatedRelationships, [rel_name]: val}})) : undefined} error={err?.message}/>
              <Fill/>
              {
                flow_context?.editable ? 
                <DeleteIcon size={24} onClick={() => {
                  setModel(model => {
                    let new_autorels = {...model.autoterminatedRelationships};
                    delete new_autorels[rel_name];
                    return {...model, autoterminatedRelationships: new_autorels};
                  })
                }}/>
                : null
              }
            </div>;
          })
        }
      </div>
      }
      <div className="section">
        <div className="section-title">Scheduling</div>
        <Dropdown name="STRATEGY" width="100%" initial={model.scheduling.strategy} items={["TIMER_DRIVEN", "EVENT_DRIVEN", "CRON_DRIVEN"]} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, strategy: val as any}})) : undefined}/>
        <InputField name="MAX CONCURRENT TASKS" width="100%" default={`${model.scheduling.concurrentTasks}`} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, concurrentTasks: val}})) : undefined}/>
        <InputField name="RUN SCHEDULE" width="100%" default={model.scheduling.runSchedule} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, runSchedule: val}})) : undefined}/>
        <InputField name="RUN DURATION" width="100%" default={model.scheduling.runDuration} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, scheduling: {...curr.scheduling, runDuration: val}})) : undefined}/>
      </div>
      <div className="section">
        <div className="section-title">Properties</div>
        {
          Object.keys(model.properties).sort().map(prop_name => {
            if (!props.manifest.propertyDescriptors || !(prop_name in props.manifest.propertyDescriptors)) {
              // dynamic property
              return null;
            }
            if (isSpecialInputField(props.model.type, prop_name)) {
              return null;
            }
            const values = props.manifest.propertyDescriptors[prop_name].allowableValues;
            if (values) {
              return <PropertyDropdown key={prop_name} name={prop_name} width="100%" items={values.map(val => val.value)} initial={model.properties[prop_name]}
                  onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}})) : undefined} visible={model.visibleProperties?.includes(prop_name) ?? false} onChangeVisibility={onChangeVisibility}/>
            }
            return <PropertyField key={prop_name} name={prop_name} width="100%" default={model.properties[prop_name]}
                onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}})) : undefined} visible={model.visibleProperties?.includes(prop_name) ?? false} onChangeVisibility={onChangeVisibility}/>
          })
        }
      </div>
      {!props.manifest.supportsDynamicProperties ? null : 
      <div className="section">
        <div className="section-title">Dynamic Properties<span style={{flexGrow: 1}}/>
          {
            flow_context?.editable ? 
            <div className="add-dynamic-property" onClick={openCreateDynPropCb}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </div>
            : null
          }
        </div>
        {
          Object.keys(model.properties).sort().map(prop_name => {
            if (props.manifest.propertyDescriptors && prop_name in props.manifest.propertyDescriptors) {
              // not dynamic property
              return null;
            }
            return <div className="dynamic-property">
              <PropertyField key={prop_name} name={prop_name} width="100%" default={model.properties[prop_name]} onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}})) : undefined}/>
              <Fill/>
              {
                flow_context?.editable ? 
                <DeleteIcon size={24} onClick={() => {
                  setModel(model => {
                    let new_props = {...model.properties};
                    delete new_props[prop_name];
                    return {...model, properties: new_props};
                  })
                }}/>
                : null
              }
            </div>
          })
        }
      </div>
      }
      {
        Object.keys(model.properties).sort().map(prop_name => {
          if (!isSpecialInputField(props.model.type, prop_name)) {
            return null;
          }
          return <SpecialInputField key={prop_name} name={prop_name} width="100%" default={model.properties[prop_name]}
              onChange={flow_context?.editable ? val=>setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: val}})) : undefined} visible={model.visibleProperties?.includes(prop_name) ?? false} onChangeVisibility={onChangeVisibility}/>
        })
      }
    </div>
    <div className={`tab ${activeTab === "runs" && activeRunInfo === null ? 'active': ''}`}>
      {flow_context?.agentId !== undefined ? 
        <>
          {(props.runs ?? []).map((run, idx) => {
            return <div key={run.id} className="run-item" onClick={()=>setActiveRunInfo({runIdx: idx, triggerIdx: null})}>Run {idx + 1}
              <div className="duplicate-run" onClick={(e) => {
                e.stopPropagation();
                updateRun(run.id, (curr)=>[curr, {...curr, id: uuid.v4() as Uuid}])
              }}><CopyIcon size={20}/></div>
              {
                run.output ?
                <div className="edit-run" onClick={(e)=>{
                  e.stopPropagation();
                  openModal(<ConfirmModal confirmLabel="Edit" text={`Warning, you are about to delete the output of this run. Are you sure?`} onConfirm={()=>{
                    updateRun(run.id, curr => ({...curr, output: undefined})); setActiveRunInfo(null)
                  }}/>)
                }}><EditIcon size={20}/></div>
                : null
              }
              <Fill/>
              {
                (()=>{
                  if (!run.output || run.output === "PENDING") return null;
                  if (run.output.schedule_error !== undefined || run.output.trigger_error !== undefined) {
                    return <div className="run-tag failed">failed</div>
                  }
                  return <div className="run-tag success">success</div>
                })()
              }
              {
                <DeleteIcon size={20} onClick={(e)=>{
                  e.stopPropagation();
                  openModal(<ConfirmModal confirmLabel="Delete" text={`Warning, you are about to irrevocably delete this run. Are you sure?`} onConfirm={()=>{
                    updateRun(run.id, curr => undefined); setActiveRunInfo(null)
                  }}/>)
                }} />
              }
            </div>
          })}
          <div className="new-run"><div onClick={()=>updateRun(uuid.v4() as Uuid, (curr)=>curr)}>Add new run</div></div>
        </>
        : null
      }
    </div>
    <div className={`tab ${activeTab === "runs" ? 'active': ''}`}>
      {(()=>{
        if (activeRunInfo === null) return null;
        const activeRun = props.runs?.[activeRunInfo.runIdx];
        if (!activeRun) return null;
        const activeTrigger = activeRunInfo.triggerIdx !== null ? activeRun.input.triggers[activeRunInfo.triggerIdx] : null;
        if (activeTrigger) {
          return <>
            <div className="run-navigation-header">
              <div className="navigation-item" onClick={()=>setActiveRunInfo(curr => (curr ? {...curr, triggerIdx: null} : null))}>Run {activeRunInfo.runIdx + 1}</div>
              <ArrowRightIcon size={20} />
              <div className="navigation-item">Trigger {activeRunInfo.triggerIdx! + 1}</div>
            </div>
            <RunTriggerInstance run={activeRun} model={activeTrigger} runId={activeRun.id} triggerIdx={activeRunInfo.triggerIdx!} updateTrigger={activeRun.output ? undefined : updateTrigger} updateTriggerFF={activeRun.output ? undefined : updateTriggerFF} />
          </>
        }
        return <>
          <div className="run-navigation-header">
              <div className="navigation-item">Run {activeRunInfo.runIdx + 1}</div>
          </div>
          <RunInstance model={activeRun} updateRun={activeRun.output ? undefined : updateRun} setActiveRunInfo={setActiveRunInfo} idx={activeRunInfo.runIdx} updateTrigger={activeRun.output ? undefined : updateTrigger} updateTriggerFF={activeRun.output ? undefined : updateTriggerFF} triggerRun={activeRun.output ? undefined : triggerRun}/>
        </>
      })()}
    </div>
    <div className="close" onClick={()=>flow_context?.closeComponentEditor()}>
      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </div>
  </div>
}

function RunInstance(props: {model: ProcessorRun, idx: number,
      updateRun?: (runId: Uuid, fn: (curr: ProcessorRun)=>ProcessorRun|undefined)=>void,
      updateTrigger?: (runId: Uuid, triggerIdx: number, fn: (curr: TriggerInfo)=>TriggerInfo|undefined)=>void,
      updateTriggerFF?: (runId: Uuid, triggerIdx: number, ffIdx: number, fn: (curr: FlowFileData)=>FlowFileData|undefined)=>void,
      setActiveRunInfo: (fn: ActiveRunInfo|((curr: ActiveRunInfo)=>ActiveRunInfo))=>void,
      triggerRun?: (args: RunInput)=>Promise<RunResult>
    }) {
  const openModal = useContext(ModalContext);
  const services = useContext(ServiceContext);
  const notif = useContext(NotificationContext);
  return <div className="section run">
    {
      (()=>{
        if (props.model.output !== "PENDING" && props.model.output?.schedule_error !== undefined) {
          return <div className="run-error">{props.model.output?.schedule_error}</div>;
        }
        return null;
      })()
    }
    <div className="section">
      <div className="section-title">State<div className="copy-state" onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(props.model.input.state ?? {})).then(()=>{
                notif.emit("Copied state to clipboard", "success");
              }).catch(()=>{
                notif.emit("Failed to copy state", "error");
              });
            }}><CopyIcon size={20}/></div>{props.updateRun ? <div className="paste-state" onClick={() => {
            navigator.clipboard.readText().then((state_str) => {
              const new_state = JSON.parse(state_str);
              props.updateRun!(props.model.id, (curr)=>({...curr, input: {...curr.input, state: new_state}}));
            }).catch(()=>{
              notif.emit("Failed to paste state", "error");
            });
          }}><PasteIcon size={20}/></div> : null}<Fill/>
        {props.updateRun ?
          <div className="add-state-entry" onClick={()=>{
            openModal(<CreateStringModal text="Add Run State Entry" onSubmit={(key) => {
              props.updateRun!(props.model.id, (curr) => ({...curr, input: {...curr.input, state: {...curr.input.state, [key]: ''}}}));
            }}/>);
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div>
          : null
        }
      </div>
      {
        props.updateRun ?
        Object.entries(props.model.input.state ?? {}).map(([key, value]) => {
          return <div key={key} className="component-state-entry">
            <InputField name={key} width="100%" default={value} onChange={val=>props.updateRun!(props.model.id, curr => {
                return {...curr, input: {...curr.input, state: {...curr.input.state, [key]: val}}};
            })}/>
            <Fill/>
            <DeleteIcon size={24} onClick={() => {
              props.updateRun!(props.model.id, curr => {
                  const new_state = {...curr.input.state};
                  delete new_state[key];
                  return {...curr, input: {...curr.input, state: new_state}};
              })
            }}/>
          </div>;
        })
        :
        <div className={`processor-state version-4`}>
          {
            Object.entries(props.model.input.state ?? {}).map(([key, value]) => {
              return <div key={key} className="component-state-entry">
                <div className="key">{key}</div>
                <div className="value">{value}</div>
              </div>;
            })
          }
        </div>
      }
    </div>
    <div className="section">
      <div className="section-title">Triggers<Fill/>
        {
          props.updateRun ?
          <div className="add-trigger-entry" onClick={()=>{
            props.updateRun!(props.model.id, (curr) => ({...curr, input: {...curr.input, triggers: [...curr.input.triggers, []]}}));
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div>
          : null
        }
      </div>
      {
        props.model.input.triggers.map((trigger, idx) => {
          return <div key={idx} className="trigger-item" onClick={()=>props.setActiveRunInfo({runIdx: props.idx, triggerIdx: idx})}>Trigger {idx + 1}<Fill/>
            {
              (()=>{
                if (!props.model.output || props.model.output === "PENDING") return null;
                if (props.model.output.schedule_error !== undefined) return <div className="run-tag skipped">skipped</div>;
                if (props.model.output.trigger_error === undefined) return <div className="run-tag success">success</div>;
                if (idx < props.model.output.results.length - 1) {
                  return <div className="run-tag success">success</div>
                }
                if (idx === props.model.output.results.length - 1) {
                  return <div className="run-tag failed">failed</div>
                }
                return <div className="run-tag skipped">skipped</div>;
              })()
            }
            {
              props.updateTrigger ?
              <DeleteIcon size={20} onClick={(e)=>{
                e.stopPropagation();
                openModal(<ConfirmModal confirmLabel="Delete" text={`Warning, you are about to irrevocably delete this trigger. Are you sure?`} onConfirm={()=>{
                  props.updateTrigger!(props.model.id, idx, curr => undefined); props.setActiveRunInfo(curr => (curr ? {...curr, triggerIdx: null} : null))
                }}/>)
              }} />
              : null
            }
          </div>;
          // return <RunTriggerInstance key={idx} model={trigger} runId={props.model.id} updateTrigger={props.updateTrigger} updateTriggerFF={props.updateTriggerFF} triggerIdx={idx}/>
        })
      }
    </div>
    {
      props.triggerRun || props.model.output === "PENDING" ?
      <div className="execute-run-container">{
        <div className={`execute-run ${props.model.output === "PENDING" ? "pending" : ''}`} onClick={() => {
          if (props.model.output === "PENDING") return;
          props.updateRun!(props.model.id, curr => ({...curr, output: "PENDING"}))
          props.triggerRun!(props.model.input).then(result => {
            props.updateRun!(props.model.id, curr => ({...curr, output: result}))
          })
        }}><span className="label">Execute run</span>{props.model.output === "PENDING" ? <Loader/> : null}</div>
      }</div>
      : null
    }
  </div>;
}

function RunTriggerInstance(props: {
        run: ProcessorRun, model: TriggerInfo, runId: Uuid, triggerIdx: number,
        updateTrigger?: (runId: Uuid, triggerIdx: number, fn: (curr: TriggerInfo)=>TriggerInfo|undefined)=>void,
        updateTriggerFF?: (runId: Uuid, triggerIdx: number, ffIdx: number, fn: (curr: FlowFileData)=>FlowFileData|undefined)=>void}) {
  const notif = useContext(NotificationContext);
  
  return <div className="section">
    {
      (()=>{
        if (props.run.output !== "PENDING" && props.run.output?.trigger_error !== undefined && props.run.output.results.length - 1 === props.triggerIdx) {
          return <div className="run-error">{props.run.output?.trigger_error}</div>;
        }
        return null;
      })()
    }
    <div className="section">
      <div className="section-title">Inputs<Fill/>
      {
        props.updateTrigger ? 
        <div className="add-input-entry" onClick={()=>{
          props.updateTrigger!(props.runId, props.triggerIdx, (curr) => [...curr, {attributes: {}, content: ''}])
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </div>
        : null
      }
      </div>
      {
        (()=>{
          if (props.run.output && props.run.output !== "PENDING") {
            const trigger_results = props.run.output.results[props.triggerIdx];
            let all_prev_processed = 0;
            for (let trigger_idx = 0; trigger_idx < props.triggerIdx; ++trigger_idx) {
              all_prev_processed += props.run.output.results[trigger_idx].processed_input;
            }
            const ff_upto_trigger: {data: FlowFileData, triggerIdx: number}[] = [];
            for (let trigger_idx = 0; trigger_idx <= props.triggerIdx; ++trigger_idx) {
              for (const ff of props.run.input.triggers[trigger_idx]) {
                ff_upto_trigger.push({data: ff, triggerIdx: trigger_idx});
              }
            }
            return ff_upto_trigger.slice(all_prev_processed).map((ff, idx) => {
              const labels: string[] = [];
              if (ff.triggerIdx !== props.triggerIdx) {
                // transferred from previous trigger input
                labels.push(`Trigger ${ff.triggerIdx + 1}`);
              }
              if (idx < trigger_results.processed_input) {
                return <RunInputFF key={idx} model={ff.data} runId={props.runId} triggerIdx={props.triggerIdx} idx={idx} labels={labels}/>
              }
              labels.push("ignored");
              return <RunInputFF key={idx} className="ignored" model={ff.data} runId={props.runId} triggerIdx={props.triggerIdx} idx={idx} labels={labels}/>
            })
          }
          return props.model.map((ff, idx) => {
            return <RunInputFF key={idx} model={ff} runId={props.runId} triggerIdx={props.triggerIdx} updateTriggerFF={props.updateTriggerFF} idx={idx}/>
          })
        })()
      }
    </div>
    {
      (()=>{
        if (props.run.output === "PENDING") return null;
        const trigger_result = props.run.output?.results[props.triggerIdx];
        if (!trigger_result) return null;
        return <div className="section">
          <div className="section-title">Processed Inputs</div>
          <InputField name="" width="100%" default={`${trigger_result.processed_input}`} />
        </div>
      })()
    }
    {
      (()=>{
        if (props.run.output === "PENDING") return null;
        const trigger_result = props.run.output?.results[props.triggerIdx];
        if (!trigger_result) return null;
        let input_state: ComponentKVState|undefined;
        if (props.triggerIdx > 0) {
          input_state = props.run.output!.results[props.triggerIdx - 1].end_state;
        } else {
          input_state = props.run.input.state;
        }
        return <>
          <div className="section">
            <div className="section-title">Input State<div className="copy-state" onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(input_state)).then(()=>{
                notif.emit("Copied state to clipboard", "success");
              }).catch(()=>{
                notif.emit("Failed to copy state", "error");
              });
            }}><CopyIcon size={20}/></div></div>
            <div className={`processor-state version-4`}>
            {
              Object.entries(input_state ?? {}).map(([key, value]) => {
                return <div key={key} className="component-state-entry">
                  <div className="key">{key}</div>
                  <div className="value">{value}</div>
                </div>;
              })
            }
            </div>
          </div>
          <div className="section">
            <div className="section-title">Output State<div className="copy-state" onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(trigger_result.end_state)).then(()=>{
                notif.emit("Copied state to clipboard", "success");
              }).catch(()=>{
                notif.emit("Failed to copy state", "error");
              });
            }}><CopyIcon size={20}/></div></div>
            <div className={`processor-state version-4`}>
            {
              Object.entries(trigger_result.end_state ?? {}).map(([key, value]) => {
                return <div key={key} className="component-state-entry">
                  <div className="key">{key}</div>
                  <div className="value">{value}</div>
                </div>;
              })
            }
            </div>
          </div>
        </>;
      })()
    }
    {
      (()=>{
        if (props.run.output === "PENDING") return null;
        const trigger_result = props.run.output?.results[props.triggerIdx];
        if (!trigger_result) return null;
        return Object.entries(trigger_result.output).map(([rel, ffs]) => {
          return <div className="section">
            <div className="section-title">Output {rel}</div>
            {
              ffs.map((ff, idx) => {
                return <RunInputFF key={idx} model={ff} runId={props.runId} triggerIdx={props.triggerIdx} idx={idx}/>
              })
            }
          </div>
        })
      })()
    }
  </div>
}

function RunInputFF(props: {
      model: FlowFileData, runId: Uuid, triggerIdx: number, idx: number, labels?: string[], className?: string
      updateTriggerFF?: (runId: Uuid, triggerIdx: number, ffIdx: number, fn: (curr: FlowFileData)=>FlowFileData|undefined)=>void}) {
  const openModal = useContext(ModalContext);
  
  return <div className={`component-run-input ${props.className ?? ''}`}>
    {
      (props.labels?.length ?? 0) !== 0 ?
      <div className="run-input-header">{
        props.labels!.map(label => <div key={label} className="label">{label}</div>)
      }</div>
      : null
    }
    {
      props.updateTriggerFF ? 
      <div className="run-input-header">Flow File {props.idx + 1}<Fill/>
        <DeleteIcon size={24} onClick={() => {
          props.updateTriggerFF!(props.runId, props.triggerIdx, props.idx, curr => undefined);
        }}/>
      </div>
      : null
    }
  <div className="run-input-body">
    <div className="section run-ff-attributes">
      <div className="section-title">Attributes
        {
          props.updateTriggerFF ?
          <><Fill/><div className="add-ff-attribute" onClick={()=>{
              openModal(<CreateStringModal text="Add Run Flow File Attribute" onSubmit={(key) => {
                props.updateTriggerFF!(props.runId, props.triggerIdx, props.idx, (curr) => ({...curr, attributes: {...curr.attributes, [key]: ''}}))
              }}/>);
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div></>
          : null
        }
      </div>
      {Object.entries(props.model.attributes).map(([attr_name, attr_val]) => {
        return <div className="ff-attribute-entry">
          <InputField name={attr_name} width="100%" default={attr_val} onChange={props.updateTriggerFF ? (val=>props.updateTriggerFF!(props.runId, props.triggerIdx, props.idx, curr => {
            return {...curr, attributes: {...curr.attributes, [attr_name]: val}};
          })) : undefined}/>
          {
            props.updateTriggerFF ? 
            <>
              <Fill/>
              <DeleteIcon size={24} onClick={() => {
                props.updateTriggerFF!(props.runId, props.triggerIdx, props.idx, curr => {
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


    <div className="section">
      <div className="section-title">Content</div>
      <InputField name="" width="100%" default={props.model.content} onChange={props.updateTriggerFF ? (val=>props.updateTriggerFF!(props.runId, props.triggerIdx, props.idx, curr => {
          return {...curr, content: val};
      })) : undefined}/>
    </div>
  </div>
</div>;
}