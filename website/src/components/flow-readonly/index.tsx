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
import { PublishModal } from "../publish-modal";
import { useNavigate } from "react-router";
import { NotificationContext } from "../../common/notification-context";
import { Eval } from "../../utils/attribute-expression";
import { ServiceSelector } from "../service-selector";
import { ServiceEditor } from "../service-editor";

interface FlowEditorState {
  flow: FlowObject,
  panning: boolean,
  editingComponent: Processor | Connection | MiNiFiService| null,
}

function width(proc: Processor) {
  return proc.size?.width ?? 50;
}

function height(proc: Processor) {
  return proc.size?.height ?? 50;
}

const padding = 5;

export function FlowReadonlyEditor(props: {id: string, flow: FlowObject, agentId?: string}) {
  const [state, setState] = useState<FlowEditorState>({flow: props.flow, panning: false,  editingComponent: null});
  const [errors, setErrors] = useState<ErrorObject[]>([]);
  const areaRef = React.useRef<HTMLDivElement>(null);
  const services = React.useContext(ServiceContext);
  const notif = React.useContext(NotificationContext);
  const mousedown = React.useCallback((e: React.MouseEvent)=>{
    if (e.button !== 0) return;
    setState(st => {
      if (st.editingComponent) return st;
      return {...st, panning: true}
    });
  }, [])

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
        let flow_info: FlowInfo|null = null;
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
          state.flow.connections.map(conn => {
            const srcProc = state.flow.processors.find(proc => proc.id === conn.source.id);
            const dstProc = state.flow.processors.find(proc => proc.id === conn.destination.id);
            if (!srcProc || !dstProc) {
              console.error(`Couldn't find processors for connection '${conn.id}'`);
              return null;
            }
            return <ConnectionView model={conn} key={conn.id} id={conn.id}
              from={{
                x: srcProc.position.x + width(srcProc) / 2,
                y: srcProc.position.y + height(srcProc) / 2,
                w: width(srcProc) + 2 * padding,
                h: height(srcProc) + 2 * padding,
                circular: srcProc.size?.circular ?? true
              }}
              to={{
                x: dstProc.position.x + width(dstProc) / 2,
                y: dstProc.position.y + height(dstProc) / 2,
                w: width(dstProc) + 2 * padding,
                h: height(dstProc) + 2 * padding,
                circular: dstProc.size?.circular ?? true
              }}
              name={conn.name ? conn.name : Object.keys(conn.sourceRelationships).filter(key => conn.sourceRelationships[key]).sort().join(", ")}/>
          })
        }
        {
          state.flow.processors.map(proc => {
            const proc_errors = errors.filter(err => err.component === proc.id);
            return <Widget key={proc.id} errors={proc_errors} value={proc} />
          })
        }
        {
          state.flow.services.map(service => {
            const service_errors = errors.filter(err => err.component === service.id);
            return <Widget key={service.id} value={service} service errors={service_errors} />
          })
        }
      </Surface>
      {
        !state.editingComponent ? null :
        <div className="component-editor-container">
          <div className="overlay" onClick={flowContext.closeComponentEditor}/>
          <div className="component-editor">{
            (()=>{
              if ("source" in state.editingComponent!) {
                return <ConnectionEditor model={state.editingComponent}/>;
              } else if ("scheduling" in state.editingComponent) {
                const proc_manifest = state.flow.manifest.processors.find(proc => proc.type === (state.editingComponent as Processor).type)!;
                const proc_errors = errors.filter(err => err.component === (state.editingComponent as Processor).id);
                return <ProcessorEditor model={state.editingComponent as Processor} manifest={proc_manifest} errors={proc_errors} state={state.flow.state?.[state.editingComponent.id]}/>
              } else {
                // service
                const service_manifest = state.flow.manifest.controllerServices.find(service => service.type === (state.editingComponent as MiNiFiService).type)!;
                return <ServiceEditor model={state.editingComponent as MiNiFiService} manifest={service_manifest}/>
              }
            })()
          }
          </div>
        </div>
      }
    </div>
  </FlowContext.Provider>
}

function useFlowContext(services: Services|null, agentId: string|undefined, areaRef: React.RefObject<HTMLDivElement>, state: FlowEditorState, setState: (value: React.SetStateAction<FlowEditorState>)=>void) {
  const notif = React.useContext(NotificationContext);
  
  const showMenu = React.useCallback((position: {clientX: number, clientY: number}, items: {name: string, on: ()=>void}[])=>{
    setState(st => st)
  }, [])

  const hideMenu = React.useCallback(()=>{
    setState(st => st)
  }, [])

  const moveComponent = React.useCallback((id: Uuid, dx: number, dy: number)=>{
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
      const proc = st.flow.processors.find(proc => proc.id === id);
      if (proc) {
        return {...st, editingComponent: proc};
      }
      const conn = st.flow.connections.find(conn => conn.id === id);
      if (conn) {
        return {...st, editingComponent: conn};
      }
      const serv = st.flow.services.find(serv => serv.id === id);
      if (serv) {
        return {...st, editingComponent: serv};
      }
      return st;
    })
  }, []);

  const updateProcessor = React.useCallback((id: Uuid, fn: (curr: Processor)=>Processor)=>{
    setState(st => st)
  }, []);

  const updateConnection = React.useCallback((id: Uuid, fn: (curr: Connection)=>Connection)=>{
    setState(st => st)
  }, []);

  const updateService = React.useCallback((id: Uuid, fn: (curr: MiNiFiService)=>MiNiFiService)=>{
    setState(st => st)
  }, []);

  const closeComponentEditor = React.useCallback(()=>{
    setState(st => ({...st, editingComponent: null}))
  }, [])

  React.useEffect(()=>{
    setState(st => {
      if (!state.editingComponent) return st;
      const proc = state.flow.processors.find(proc => proc.id === state.editingComponent!.id);
      if (proc && proc !== state.editingComponent) {
        return {...st, editingComponent: proc};
      }
      const conn = state.flow.connections.find(conn => conn.id === state.editingComponent!.id);
      if (conn && conn !== state.editingComponent) {
        return {...st, editingComponent: conn};
      }
      return st;
    })
  }, [state.flow.processors, state.flow.connections])

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

  let updateRun = React.useCallback((proc_id: Uuid, run_id: Uuid, fn: (run: ProcessorRun)=>ProcessorRun|undefined)=>{
    setState(st => {
      const proc = st.flow.processors.find(proc => proc.id === proc_id);
      if (!proc) return st;
      let prev_run = proc.runs?.find(run => run.id === run_id);
      let run = prev_run;
      let created_run = false;
      if (!run) {
        created_run = true;
        run = {id: run_id, input: {state: {}, triggers: []}};
      }
      const new_run = fn(run);
      if (new_run === prev_run) return st;
      if (!new_run) {
        if (created_run) return st;
        return {...st, flow: {...st.flow, processors: st.flow.processors.map(curr_proc => {
          if (curr_proc !== proc) return curr_proc;
          return {...curr_proc, runs: curr_proc.runs?.filter(curr_run => curr_run !== prev_run)}
        })}}
      }
      const new_runs = (proc.runs ?? [])!.map(curr_run => {
        if (curr_run !== run) return curr_run;
        return new_run;
      });
      if (created_run) {
        new_runs.push(new_run);
      }
      return {...st, flow: {...st.flow, processors: st.flow.processors.map(curr_proc => {
        if (curr_proc !== proc) return curr_proc;
        return {...curr_proc, runs: new_runs}
      })}}
    })
  }, [])


  return React.useMemo(()=>(
      {showMenu, moveComponent, deleteComponent, hideMenu, editComponent, updateProcessor,
      updateConnection, updateService, closeComponentEditor, closeNewProcessor, closeNewService,
      moveConnection, startProcessor, stopProcessor, clearProcessorState, updateRun, editable: false, agentId}),
    [showMenu, moveComponent, deleteComponent, hideMenu, editComponent, updateProcessor,
    updateConnection, updateService, closeComponentEditor, closeNewProcessor, closeNewService,
    moveConnection, startProcessor, stopProcessor, clearProcessorState, updateRun, agentId]);
}