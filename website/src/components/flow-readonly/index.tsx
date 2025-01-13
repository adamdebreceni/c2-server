import { useState } from "react"
import * as React from "react";
import { Surface } from "../surface";
import { Widget } from "../widget";
import * as uuid from 'uuid';

import "../flow-editor/index.scss"
import { ConnectionView } from "../connection";
import { FlowContext } from "../../common/flow-context";
import { Menu } from "../menu";
import { ProcessorEditor } from "../processor-editor";
import { ConnectionEditor } from "../connection-editor";
import { ProcessorSelector } from "../processor-selector";
import { ServiceContext } from "../../common/service-context";
import { useNavigate } from "react-router";
import { NotificationContext } from "../../common/notification-context";
import { Eval } from "../../utils/attribute-expression";
import { ServiceSelector } from "../service-selector";
import { ServiceEditor } from "../service-editor";
import { emitProcessGroupItems, PositionableGroup } from "../flow-editor";
import { FunnelEditor } from "../funnel-editor";
import { ProcessGroupEditor } from "../process-group-editor";
import { ProcessGroupPortEditor } from "../port-editor";
import { ParameterContextEditor } from "../parameter-context-editor";

interface FlowEditorState {
  selected: Uuid[],
  flow: FlowObject,
  panning: boolean,
  editingComponent: Uuid | null,
}

function width(proc: Processor) {
  return proc.size?.width ?? 50;
}

function height(proc: Processor) {
  return proc.size?.height ?? 50;
}

const padding = 5;

function isFlowInfoJava(flow_info: FlowInfo | FlowInfoJava): flow_info is FlowInfoJava {
  return (flow_info as FlowInfoJava).processorStatuses !== undefined;
}

function isFlowInfoCpp(flow_info: FlowInfo | FlowInfoJava): flow_info is FlowInfo {
  return (flow_info as FlowInfo).components !== undefined;
}

export function FlowReadonlyEditor(props: {id: string, flow: FlowObject, agentId?: string}) {
  const [state, setState] = useState<FlowEditorState>({flow: props.flow, panning: false,  editingComponent: null, selected: []});
  const [errors, setErrors] = useState<ErrorObject[]>([]);
  const areaRef = React.useRef<HTMLDivElement>(null);
  const services = React.useContext(ServiceContext);
  const notif = React.useContext(NotificationContext);
  const navigate = useNavigate();
  const goToAgent = React.useCallback(() => {
    if (!props.agentId) return;
    navigate(`/agent/${props.agentId}`);
  }, [props.agentId]);
  const mousedown = React.useCallback((e: React.MouseEvent)=>{
    if (e.button !== 0) return;
    setState(st => {
      if (st.editingComponent) return st;
      return {...st, panning: true}
    });
  }, []);

  React.useEffect(()=>{
    if (!props.agentId) return;
    if (state.flow.runs === props.flow.runs) return;
    let id = setTimeout(()=>{
      services?.agents.saveConfig(props.agentId!, state.flow.runs);
    }, 1000);
    return ()=>{
      clearTimeout(id);
    }
  }, [props.agentId, state.flow.runs]);

  React.useEffect(()=>{
    if (!props.agentId) {
      return;
    }
    const flow_info_timeout = 1000;
    let mounted = true;

    let flow_info_id: any;
    const update_flow_info = () => {
      services?.agents.fetchAgentInformation(props.agentId!).then(agent => {
        if (mounted) {
          flow_info_id = setTimeout(update_flow_info, flow_info_timeout);
        }
        if (!agent || !agent.flow_info) {
          return;
        }
        let flow_info: FlowInfo|FlowInfoJava|null = null;
        try {
          flow_info = JSON.parse(agent.flow_info);
        } catch (e) {
          notif.emit(`Failed to parse flow info`, "error");
        }
        if (!flow_info) {
          return;
        }
        setState(st => {
          let conn_changed = false;
          const new_connections: Connection[] = [];
          for (const conn of st.flow.connections) {
            if (!(conn.id in flow_info.queues)) {
              if ('size' in conn) {
                const new_conn = {...conn};
                delete new_conn.size;
                new_connections.push(new_conn);
                conn_changed = true;
              } else {
                new_connections.push(conn);
              }
              continue;
            }
            if (conn.size?.data !== flow_info.queues[conn.id].dataSize || conn.size?.count != flow_info.queues[conn.id].size ||
              conn.size?.dataMax !== flow_info.queues[conn.id].dataSizeMax || conn.size?.countMax != flow_info.queues[conn.id].sizeMax
            ) {
              new_connections.push({...conn, size: {
                data: flow_info.queues[conn.id].dataSize, count: flow_info.queues[conn.id].size,
                dataMax: flow_info.queues[conn.id].dataSizeMax, countMax: flow_info.queues[conn.id].sizeMax
              }});
              conn_changed = true;
            } else {
              new_connections.push(conn);
            }
          }
          let proc_changed = false;
          const new_processors: Processor[] = [];
          for (const proc of st.flow.processors) {
            if (isFlowInfoCpp(flow_info)) {
              if (proc.id !== flow_info.components[proc.name]?.uuid) {
                if ('running' in proc) {
                  const new_proc = {...proc};
                  delete new_proc.running;
                  new_processors.push(new_proc);
                  proc_changed = true;
                } else {
                  new_processors.push(proc);
                }
                continue;
              }
              const new_running : ComponentState = flow_info.components[proc.name].running ? "STARTED" : "STOPPED";
              if (
                  (proc.running === "STARTING" && new_running === "STARTED") ||
                  (proc.running === "STARTED" && new_running === "STOPPED") ||
                  (proc.running === "STOPPING" && new_running === "STOPPED") ||
                  (proc.running === "STOPPED" && new_running === "STARTED") ||
                  (proc.running === "UNKNOWN")) {
                new_processors.push({...proc, running: new_running});
                proc_changed = true;
              } else {
                new_processors.push(proc);
              }
            } else if (isFlowInfoJava(flow_info)) {
              if (proc.running !== "STARTED") {
                new_processors.push({...proc, running: "STARTED"});
                proc_changed = true;
              } else {
                new_processors.push(proc);
              }
            }
          }
          if (conn_changed || proc_changed) {
            return {...st,
              flow: {...st.flow, 
                connections: conn_changed ? new_connections : st.flow.connections,
                processors: proc_changed ? new_processors : st.flow.processors
              }
            }
          }
          return st;
        })
      })
    };
    flow_info_id = setTimeout(update_flow_info, flow_info_timeout);

    const component_state_timeout = 1000;
    let compoent_state_id: any;
    const update_component_state = () => {
      services?.agents.fetchAgentComponentState(props.agentId!).then(state => {
        if (mounted) {
          compoent_state_id = setTimeout(update_component_state, component_state_timeout);
        }
        if (!state) {
          return;
        }
        setState(st => {
          const new_state = {...state};
          if (st.flow.state) {
            for (const id in st.flow.state) {
              if (st.flow.state[id] === "DELETING") {
                new_state[id] = "DELETING";
              }
            }
          }
          return {...st, flow: {...st.flow, state: new_state}};
        })
      })
    };
    compoent_state_id = setTimeout(update_component_state, component_state_timeout);
    return () => {
      mounted = false;
      clearTimeout(flow_info_id);
      clearTimeout(compoent_state_id);
    }
  }, [props.agentId])

  React.useEffect(()=>{
    let errors: ErrorObject[] = [];
    for (let proc of state.flow.processors) {
      const proc_manifest = state.flow.manifest.processors.find(proc_manifest => proc_manifest.type === proc.type)!;
      for (let rel in proc.autoterminatedRelationships) {
        const conn = state.flow.connections.find(conn => conn.source.id === proc.id && (rel in conn.sourceRelationships) && conn.sourceRelationships[rel]);
        if (conn && proc.autoterminatedRelationships[rel]) {
          errors.push({component: proc.id, type: "RELATIONSHIP", target: rel, message: `Relationship '${rel}' is both connected and auto-terminated`});
        }
        if (!conn && (!(rel in proc.autoterminatedRelationships) || !proc.autoterminatedRelationships[rel])) {
          errors.push({component: proc.id, type: "RELATIONSHIP", target: rel, message: `Relationship '${rel}'  has to be either connected or auto-terminated`});
        }
      }
    }
    setErrors(errors);
  }, [state.flow])

  React.useEffect(()=>{
    const mousemove = (e: MouseEvent)=>{
      setState(st=>{
        if (st.editingComponent || !st.panning) return st;

        return {
          ...st, 
          flow: {...st.flow, view: {x: st.flow.view.x - e.movementX / st.flow.view.zoom, y: st.flow.view.y - e.movementY / st.flow.view.zoom, zoom: st.flow.view.zoom}}
        }
      })
    }
  
    const mouseup = (e: MouseEvent)=>{
      setState(st=> {
        if (st.editingComponent) return st;
        return {...st, panning: false};
      })
    }

    
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
    return ()=>{
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
    }
  }, [])

  const flowContext = useFlowContext(services, props.agentId, areaRef, state, setState);

  return <FlowContext.Provider value={flowContext}>
    <div className="flow-editor" ref={areaRef} onMouseDown={mousedown}>
      <div className="background">
        <div className="flow-state">Readonly view</div>
      </div>
      <Surface {...state.flow.view}>
        {
          state.flow.services.map(service => {
            const service_errors = errors.filter(err => err.component === service.id);
            return <Widget key={service.id} value={service} errors={service_errors} kind='service' />
          })
        }
        {
          state.flow.parameterContexts?.map(ctx => {
            return <Widget key={ctx.id} value={ctx} kind='parameter-context' />
          })
        }
        {
          emitProcessGroupItems(state, errors, null, null)
        }
        {
          (()=>{
            const group_containers = new Map<Uuid, PositionableGroup>();
            return state.flow.processGroups?.map(group => {
              return emitProcessGroupItems(state, errors, group, group_containers);
            }).flat()
          })()
        }
      </Surface>
      <div className="absolute right-0 top-0 px-5 py-2 text-gray-400 bg-white hover:text-gray-800 cursor-pointer m-5 border-gray-400 hover:border-gray-800 border-solid border-[1px] rounded-[3px]" onClick={()=>{
        navigate(`/flow/${props.id}`);
      }}>Edit</div>
      {
        props.agentId ?
        <div className="agent-identifier" onClick={goToAgent}>{props.agentId}</div>
        : null
      }
      {
        !state.editingComponent ? null :
        <div className="component-editor-container">
          <div className="overlay" onClick={flowContext.closeComponentEditor}/>
          <div className="component-editor">{
            (()=>{
              const conn = state.flow.connections.find(conn => conn.id === state.editingComponent);
              if (conn) {
                return <ConnectionEditor model={conn}/>;
              }
              const proc = state.flow.processors.find(proc => proc.id === state.editingComponent);
              if (proc) {
                const proc_manifest = state.flow.manifest.processors.find(proc_manifest => proc_manifest.type === proc.type)!;
                const proc_errors = errors.filter(err => err.component === proc.id);
                return <ProcessorEditor model={proc} manifest={proc_manifest} errors={proc_errors} state={state.flow.state?.[state.editingComponent]} runs={state.flow.runs?.[state.editingComponent]} />
              }
              const serv = state.flow.services.find(serv => serv.id === state.editingComponent);
              if (serv) {
                const service_manifest = state.flow.manifest.controllerServices.find(serv_manifest => serv_manifest.type === serv.type)!;
                return <ServiceEditor model={serv} manifest={service_manifest}/>
              }
              const funnel = state.flow.funnels.find(funnel => funnel.id === state.editingComponent);
              if (funnel) {
                return <FunnelEditor model={funnel} />
              }
              const group = state.flow.processGroups?.find(group => group.id === state.editingComponent);
              if (group) {
                return <ProcessGroupEditor model={group} contexts={state.flow.parameterContexts ?? []}/>
              }
              const port = state.flow.processGroupsPorts?.find(port => port.id === state.editingComponent);
              if (port) {
                return <ProcessGroupPortEditor model={port} />
              }
              const ctx = state.flow.parameterContexts?.find(ctx => ctx.id === state.editingComponent);
              if (ctx) {
                return <ParameterContextEditor model={ctx} />
              }
              return null;
            })()
          }
          </div>
        </div>
      }
    </div>
  </FlowContext.Provider>
}

function useFlowContext(services: Services|null, agentId: string|undefined, areaRef: React.RefObject<HTMLDivElement|null>, state: FlowEditorState, setState: (value: React.SetStateAction<FlowEditorState>)=>void) {
  const notif = React.useContext(NotificationContext);
  
  const showMenu = React.useCallback((position: {clientX: number, clientY: number}, items: {name: string, on: ()=>void}[])=>{
    setState(st => st)
  }, [])

  const hideMenu = React.useCallback(()=>{
    setState(st => st)
  }, [])

  const setMovingComponent = React.useCallback((id: Uuid, moving: boolean)=>{
    setState(st => st)
  }, []);

  const moveConnection = React.useCallback((id: Uuid, dx: number, dy: number)=>{
    setState(st => st)
  }, []);

  const deleteComponent = React.useCallback((id: Uuid)=>{
    setState(st => st)
  }, []);

  const editComponent = React.useCallback((id: Uuid)=>{
    setState(st => {
      return {...st, editingComponent: id};
    })
  }, []);

  const noopUpdate = React.useCallback((id: Uuid, fn: (curr: any)=>any)=>{}, []);

  const closeComponentEditor = React.useCallback(()=>{
    setState(st => ({...st, editingComponent: null}))
  }, [])

  const closeNewProcessor = React.useCallback((id: string|null)=>{
    setState(st => st)
  }, []);

  const closeNewService = React.useCallback((id: string|null)=>{
    setState(st => st)
  }, [])

  let startProcessor = undefined;
  if (agentId && services) {
    startProcessor = React.useCallback((id: Uuid) => {
      setState(st => {
        return {...st, flow: {...st.flow, processors: st.flow.processors.map(proc => {
          if (proc.id !== id) return proc;
          return {...proc, running: "STARTING"};
        })}}
      });
      services.agents.startComponent(agentId, id);
    }, [])
  }

  let stopProcessor = undefined;
  if (agentId && services) {
    stopProcessor = React.useCallback((id: Uuid) => {
      setState(st => {
        return {...st, flow: {...st.flow, processors: st.flow.processors.map(proc => {
          if (proc.id !== id) return proc;
          return {...proc, running: "STOPPING"};
        })}}
      });
      services.agents.stopComponent(agentId, id);
    }, [])
  }

  let clearProcessorState = undefined;
  if (agentId && services) {
    clearProcessorState = React.useCallback((id: Uuid) => {
      setState(st => {
        return {...st, flow: {...st.flow, state: {...st.flow.state, [id]: "DELETING"}}};
      });
      services.agents.clearComponentState(agentId, id).then(() => {
        notif.emit(`Cleared processor state: ${id}`, "success")
        setState(st => {
          return {...st, flow: {...st.flow, state: {...st.flow.state, [id]: {}}}};
        });
      })
    }, [])
  }

  let updateRun = React.useCallback((proc_id: Uuid, run_id: Uuid, fn: (run: ProcessorRun)=>ProcessorRun|ProcessorRun[]|undefined)=>{
    setState(st => {
      const runs = st.flow.runs?.[proc_id];
      const prev_run_idx = runs?.findIndex(run => run.id === run_id) ?? -1;
      const prev_run = runs?.[prev_run_idx] ?? undefined;
      let run = prev_run;
      if (!run) {
        run = {id: run_id, input: {state: {}, triggers: []}};
      }
      const new_run = fn(run);
      if (new_run === prev_run) return st;
      if (!new_run) {
        if (!prev_run) return st;
        return {...st, flow: {...st.flow, runs: {...st.flow.runs, [proc_id]: runs?.filter(curr_run => curr_run !== prev_run)}}}
      }
      const new_runs = (runs ?? []).slice();
      if (prev_run_idx !== -1) {
        if (new_run instanceof Array) {
          new_runs.splice(prev_run_idx, 1, ...new_run);
        } else {
          new_runs.splice(prev_run_idx, 1, new_run);
        }
      } else {
        if (new_run instanceof Array) {
          new_runs.push(...new_run);
        } else {
          new_runs.push(new_run);
        }
      }
      return {...st, flow: {...st.flow, runs: {...st.flow.runs, [proc_id]: new_runs}}};
    })
  }, [])


  return React.useMemo(()=>(
      {showMenu, deleteComponent, hideMenu, editComponent, updateProcessor: noopUpdate,
      updateConnection: noopUpdate, updateService: noopUpdate, updateGroup: noopUpdate, updateFunnel: noopUpdate, updateParameterContext: noopUpdate, updatePort: noopUpdate, closeComponentEditor, closeNewProcessor, closeNewService,
      moveConnection, startProcessor, stopProcessor, clearProcessorState, updateRun, setMovingComponent, editable: false, agentId}),
    [showMenu, deleteComponent, hideMenu, editComponent, noopUpdate, closeComponentEditor, closeNewProcessor, closeNewService,
    moveConnection, startProcessor, stopProcessor, clearProcessorState, updateRun, setMovingComponent, agentId]);
}