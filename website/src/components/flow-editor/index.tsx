import { useState } from "react"
import * as React from "react";
import { Surface } from "../surface";
import { Widget } from "../widget";
import * as uuid from 'uuid';

import "./index.scss"
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

interface NewConnection {
  source: Uuid,
  to: {x: number, y: number} | Uuid | null,
  midPoint: {x: number, y: number} | number | null
};

interface FlowEditorState {
  saved: boolean,
  flow: FlowObject
  menu: {position: {x: number, y: number}, items: {name: string, on: ()=>void}[]}|null
  panning: boolean,
  editingComponent: Processor | Connection | MiNiFiService| null,
  newConnection: NewConnection | null,
  newComponent: {x: number, y: number, type: "PROCESSOR"|"SERVICE", srcProcessor?: Uuid} | null,
  publish: boolean
}

function width(proc: Processor) {
  return proc.size?.width ?? 50;
}

function height(proc: Processor) {
  return proc.size?.height ?? 50;
}

function createDefaultConnection(flow: FlowObject, src: Uuid, dst: Uuid, midPoint?: {x: number, y: number}|number|null): Connection {
  const proc = flow.processors.find(proc => proc.id === src)!;
  const rels: {[name: string]: boolean} = {};
  for (const rel in proc.autoterminatedRelationships) {
    rels[rel] = false;
  }
  const manifest = flow.manifest.processors.find(proc_manifest => proc_manifest.type === proc.type);
  if (manifest?.supportsDynamicRelationships) {
    for (const prop in proc.properties) {
      if (!manifest.propertyDescriptors || !(prop in manifest.propertyDescriptors)) {
        rels[prop] = false;
      }
    }
  }
  return {
    id: uuid.v4() as Uuid,
    name: null,
    source: {id: src, port: null},
    sourceRelationships: rels,
    destination: {id: dst, port: null},
    flowFileExpiration: "0 seconds",
    backpressureThreshold: {count: "10000", size: "10 MB"},
    swapThreshold: null,
    errors: [],
    attributes: [],
    midPoint: midPoint ?? undefined
  }
}

const padding = 5;

export function FlowEditor(props: {id: string, flow: FlowObject}) {
  const [state, setState] = useState<FlowEditorState>({saved: true, publish: false, flow: props.flow, panning: false, menu: null, editingComponent: null, newConnection: null, newComponent: null});
  const [errors, setErrors] = useState<ErrorObject[]>([]);
  const areaRef = React.useRef<HTMLDivElement>(null);
  const mousedown = React.useCallback((e: React.MouseEvent)=>{
    if (e.button !== 0) return;
    const {clientX, clientY} = e;
    setState(st => {
      if (st.newComponent || st.editingComponent || st.publish) return st;
      if (st.newConnection) {
        const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
        return {...st, newConnection: {...st.newConnection, to: {x, y}}};
      }
      return {...st, panning: true}
    });
  }, [])

  const services = React.useContext(ServiceContext);
  const navigate = useNavigate();

  const notif = React.useContext(NotificationContext);

  const isSavePending = React.useRef(false);

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
    if (state.flow === props.flow) return;
    let mounted = true;
    setState(st => ({...st, saved: false}));
    const id = setTimeout(()=>{
      if (isSavePending.current) return;
      isSavePending.current = true;
      services?.flows.save(props.id, state.flow).then(id=>{
        isSavePending.current = false;
        if (!mounted) return;
        setState(st => ({...st, saved: true}));
        if (id !== props.id) {
          navigate(`/flow/${id}`);
        }
        //notif.emit("Successfully saved", "success");
      });
    }, 500);
    return ()=>{
      mounted = false;
      clearTimeout(id);
    }
  }, [state.flow, props.id]);

  React.useEffect(()=>{
    const mousemove = (e: MouseEvent)=>{
      setState(st=>{
        if (st.newComponent || st.editingComponent || st.publish) return st;
        if (st.newConnection && st.newConnection.to) {
          const {x, y} = toAreaCoords(areaRef, st, e);
          const proc = findConnDestProc(st, {x, y});
          if (proc) {
            if (proc.id === st.newConnection.source) {
              let vx = x - (proc.position.x + width(proc) / 2);
              let vy = y - (proc.position.y + height(proc) / 2);
              const d = Math.sqrt(vx ** 2 + vy ** 2);
              vx = vx * (Math.max(width(proc) / 2, height(proc) / 2) + 50) / d;
              vy = vy * (Math.max(width(proc) / 2, height(proc) / 2) + 50) / d;
              return {...st, newConnection: {...st.newConnection, to: proc.id, midPoint: {x: vx, y: vy}}};
            }
            return {...st, newConnection: {...st.newConnection, to: proc.id, midPoint: null}};
          }
          return {...st, newConnection: {...st.newConnection, to: {x, y}, midPoint: null}}
        }
        if (!st.panning) {
          if (st.menu) return st;
          const {x, y} = toAreaCoords(areaRef, st, e);
          const proc = findConnSourceProc(st, {x, y});
          if (!proc) {
            if (!st.newConnection) return st;
            return {...st, newConnection: null}
          }
          return {...st, newConnection: {source: proc.id, to: null, midPoint: null}};
        }

        return {
          ...st, 
          flow: {...st.flow, view: {x: st.flow.view.x - e.movementX / st.flow.view.zoom, y: st.flow.view.y - e.movementY / st.flow.view.zoom, zoom: st.flow.view.zoom}}
        }
      })
    }
  
    const mouseup = (e: MouseEvent)=>{
      setState(st=> {
        if (st.newComponent || st.editingComponent || st.publish) return st;
        if (!st.panning && !st.newConnection) return st;
        if (typeof st.newConnection?.to === "string") {
          const newConn = createDefaultConnection(st.flow, st.newConnection.source, st.newConnection.to, st.newConnection.midPoint);
          return {...st, flow: {...st.flow, connections: [...st.flow.connections, newConn]}, newConnection: null};
        }
        const {x, y} = toAreaCoords(areaRef, st, e);
        if (st.newConnection) {
          return {...st, newComponent: {x, y, type: "PROCESSOR", srcProcessor: st.newConnection.source}};
        }
        let newConnection: NewConnection | null = null;
        const proc = findConnSourceProc(st, {x, y});
        if (proc) {
          newConnection = {source: proc.id, to: null, midPoint: null};
        }
        return {...st, panning: false, newConnection};
      })
    }

    
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
    return ()=>{
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
    }
  }, [])

  const flowContext = useFlowContext(areaRef, state, setState);

  const newComponent = React.useCallback((e: React.MouseEvent)=>{
    e.preventDefault()
    const {clientX, clientY} = e;
    flowContext.showMenu({clientX, clientY}, [
      {name: "Add processor", on: ()=>{
        setState(st => {
          const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
          return {...st, newComponent: {x, y, type: "PROCESSOR"}};
        })
        flowContext.hideMenu();
      }},
      {name: "Add service", on: ()=>{
        setState(st => {
          const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
          return {...st, newComponent: {x, y, type: "SERVICE"}};
        })
        flowContext.hideMenu();
      }}
    ])
  }, [flowContext.showMenu, flowContext.hideMenu]);

  React.useEffect(()=>{
    if (!state.newConnection || state.newComponent || state.editingComponent) {
      return;
    }
    document.body.classList.add("link-cursor");
    return () => {
      document.body.classList.remove("link-cursor");
    }
  }, [!!state.newConnection, !!state.newComponent, !!state.editingComponent])

  return <FlowContext.Provider value={flowContext}>
    <div className="flow-editor" ref={areaRef} onMouseDown={mousedown}>
      <div className="background" onContextMenu={newComponent}>
        <div className="flow-state">{state.saved ? "Saved" : "Saving..."}</div>
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
          !(state.newConnection?.to) ? null : (()=>{
            const src = state.flow.processors.find(proc => proc.id === state.newConnection!.source)!;
            let to: {x: number, y: number, w: number, h: number, circular: boolean};
            if (typeof state.newConnection.to === "string") {
              const dest = state.flow.processors.find(proc => proc.id === state.newConnection!.to)!;
              to = {
                x: dest.position.x + width(dest) / 2,
                y: dest.position.y + height(dest) / 2,
                w: width(dest) + 2 * padding,
                h: height(dest) + 2 * padding,
                circular: dest.size?.circular ?? true
              };
            } else {
              to = {...state.newConnection.to, w: 0, h: 0, circular: true};
            }
            return <ConnectionView from={{
              x: src.position.x + width(src) / 2,
              y: src.position.y + height(src) / 2,
              w: width(src) + 2 * padding,
              h: height(src) + 2 * padding,
              circular: src.size?.circular ?? true
            }}
            to={to} midPoint={state.newConnection.midPoint ?? undefined}/>
          })()
        }
        {
          state.flow.processors.map(proc => {
            const proc_errors = errors.filter(err => err.component === proc.id);
            return <Widget key={proc.id} errors={proc_errors} highlight={state.newConnection?.to === proc.id} value={proc} link={state.newConnection?.source === proc.id && !state.newConnection.to}/>
          })
        }
        {
          state.flow.services.map(service => {
            const service_errors = errors.filter(err => err.component === service.id);
            return <Widget key={service.id} value={service} service errors={service_errors} />
          })
        }
        {
          state.menu ? <div className="menu-container" style={{left: `${state.menu.position.x}px`, top: `${state.menu.position.y}px`}}>
            <Menu items={state.menu.items}/>
          </div> : null
        }
      </Surface>
      <div className="open-publish" onClick={()=>setState(st => ({...st, publish: true}))}>Publish</div>
      {
        !state.publish ? null :
        <div className="publish-container">
          <div className="overlay" onClick={()=>setState(st => ({...st, publish: false}))}/>
          <PublishModal onCancel={()=>setState(st => ({...st, publish: false}))} onPublish={(agents, classes)=>{
            services?.flows.publish(props.id, agents, classes).then(()=>{
              notif.emit("Flow published successfully", "success");
              setState(st => ({...st, publish: false}));
            })
          }}/>
        </div>
      }
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
                return <ProcessorEditor model={state.editingComponent as Processor} manifest={proc_manifest} errors={proc_errors} />
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
      {
        (()=>{
          if (!state.newComponent) return null;
          if (state.newComponent.type === "PROCESSOR") {
            return <div className="processor-selector-container">
              <div className="overlay" onClick={()=>flowContext.closeNewProcessor(null)}/>
              <ProcessorSelector processors={state.flow.manifest.processors.map(proc => ({id: proc.type, name: getUnqualifiedName(proc.type), description: proc.typeDescription}))}/>
            </div>;
          } else {
            return <div className="service-selector-container">
              <div className="overlay" onClick={()=>flowContext.closeNewService(null)}/>
              <ServiceSelector services={state.flow.manifest.controllerServices.map(service => ({id: service.type, name: getUnqualifiedName(service.type), description: service.typeDescription}))}/>
            </div>;
          }
        })()
      }
    </div>
  </FlowContext.Provider>
}

function findConnSourceProc(st: FlowEditorState, pos: {x: number, y: number}) {
  return st.flow.processors.find(proc => {
    const inner = 5;
    const outer = 20;
    if (proc.size?.circular || !proc.size) {
      const d = Math.sqrt((proc.position.x + width(proc) / 2 - pos.x) ** 2 + (proc.position.y + height(proc) / 2 - pos.y) ** 2);
      return d > width(proc)/2 - inner && d < width(proc)/2 + outer;
    }
    // top border
    if (proc.position.y - outer < pos.y && pos.y < proc.position.y + inner && proc.position.x - outer < pos.x && pos.x < proc.position.x + width(proc) + outer) {
      return true;
    }
    // bottom border
    if (proc.position.y + height(proc) - inner < pos.y && pos.y < proc.position.y + height(proc) + outer && proc.position.x - outer < pos.x && pos.x < proc.position.x + width(proc) + outer) {
      return true;
    }
    // left border
     if (proc.position.x - outer < pos.x && pos.x < proc.position.x + inner && proc.position.y - outer < pos.y && pos.y < proc.position.y + height(proc) + outer) {
      return true;
    }
    // bottom border
    if (proc.position.x + width(proc) - inner < pos.x && pos.x < proc.position.x + width(proc) + outer && proc.position.y - outer < pos.y && pos.y < proc.position.y + height(proc) + outer) {
      return true;
    }
    return false;
  })
}

function findConnDestProc(st: FlowEditorState, pos: {x: number, y: number}) {
  return st.flow.processors.find(proc => {
    const limit = 50;
    if (proc.size?.circular || !proc.size) {
      const d = Math.sqrt((proc.position.x + width(proc) / 2 - pos.x) ** 2 + (proc.position.y + height(proc) / 2 - pos.y) ** 2);
      if (proc.id !== st.newConnection!.source) {
        return d < width(proc) / 2 + limit;
      } else {
        return d < width(proc) / 2;
      }
    }
    return proc.position.x - limit <= pos.x && pos.x <= proc.position.x + width(proc) + limit && 
      proc.position.y - limit <= pos.y && pos.y <= proc.position.y + height(proc) + limit;
  })
}

function toAreaCoords(areaRef: React.RefObject<HTMLDivElement>, st: FlowEditorState, e: {clientX: number, clientY: number}) {
  const rect = areaRef.current!.getBoundingClientRect();
  const x = st.flow.view.x + (e.clientX - rect.left) / st.flow.view.zoom;
  const y = st.flow.view.y + (e.clientY - rect.top) / st.flow.view.zoom;
  return {x, y};
}

function useFlowContext(areaRef: React.RefObject<HTMLDivElement>, state: FlowEditorState, setState: (value: React.SetStateAction<FlowEditorState>)=>void) {
  const showMenu = React.useCallback((position: {clientX: number, clientY: number}, items: {name: string, on: ()=>void}[])=>{
    setState(st => {
      const {x, y} = toAreaCoords(areaRef, st, position);
      return {...st, menu: {position: {x: x + 5 / st.flow.view.zoom, y: y + 5 / st.flow.view.zoom}, items}};
    })
  }, [])

  const hideMenu = React.useCallback(()=>{
    setState(st => ({...st, menu: null}))
  }, [])

  const moveComponent = React.useCallback((id: Uuid, dx: number, dy: number)=>{
    setState(st => {
      const proc = st.flow.processors.find(proc => proc.id === id);
      if (proc) {
        const new_processors = st.flow.processors.filter(proc => proc.id !== id);
        new_processors.push({...proc, position: {x: proc.position.x + dx, y: proc.position.y + dy}});
        return {...st, flow: {...st.flow, processors: new_processors}};
      }
      const service = st.flow.services.find(service => service.id === id);
      if (!service) {
        console.error(`No component with id '${id}'`);
        return st;
      }
      const new_services = st.flow.services.filter(service => service.id !== id);
      new_services.push({...service, position: {x: service.position.x + dx, y: service.position.y + dy}});
      return {...st, flow: {...st.flow, services: new_services}};
    })
  }, []);

  const moveConnection = React.useCallback((id: Uuid, dx: number, dy: number)=>{
    setState(st => {
      const conn = st.flow.connections.find(conn => conn.id === id);
      if (!conn) return st;
      const srcProc = st.flow.processors.find(proc => proc.id === conn.source.id);
      const dstProc = st.flow.processors.find(proc => proc.id === conn.destination.id);
      if (!srcProc || !dstProc) return st;
      const src_x = srcProc.position.x + width(srcProc) / 2;
      const src_y = srcProc.position.y + height(srcProc) / 2;
      const dst_x = dstProc.position.x + width(dstProc) / 2;
      const dst_y = dstProc.position.y + height(dstProc) / 2;
      if (srcProc !== dstProc) {
        // different processors
        let vx = dst_x - src_x;
        let vy = dst_y - src_y;
        const d = Math.sqrt(vx ** 2 + vy ** 2);
        vx /= d;
        vy /= d;
        let [nx, ny] = [-vy, vx];
        const new_distance = (typeof conn.midPoint === "number" ? conn.midPoint : 0) + nx * dx + ny * dy;
        const new_connections = st.flow.connections.filter(conn => conn.id !== id);
        new_connections.push({...conn, midPoint: new_distance});
        return {...st, flow: {...st.flow, connections: new_connections}};
      }
      // loop connection
      const new_midpoint = (typeof conn.midPoint === "object") ? {x: conn.midPoint.x + dx, y: conn.midPoint.y + dy} : {x: dx, y: dy};
      const new_connections = st.flow.connections.filter(conn => conn.id !== id);
      new_connections.push({...conn, midPoint: new_midpoint});
      return {...st, flow: {...st.flow, connections: new_connections}};
    })
  }, []);

  const deleteComponent = React.useCallback((id: Uuid)=>{
    setState(st=>{
      if (st.flow.processors.find(proc => proc.id === id)) {
        return {...st, flow: {...st.flow, processors: st.flow.processors.filter(proc => proc.id !== id), connections: st.flow.connections.filter(conn => conn.id !== id && conn.source.id !== id && conn.destination.id !== id)}}
      }
      if (st.flow.connections.find(conn => conn.id === id)) {
        return {...st, flow: {...st.flow, connections: st.flow.connections.filter(conn => conn.id !== id)}}
      }
      return {...st, flow: {...st.flow, services: st.flow.services.filter(serv => serv.id !== id)}};
    })
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
    setState(st => {
      const curr = st.flow.processors.find(proc => proc.id === id);
      if (!curr) return st;
      const updated = fn(curr);
      const new_procs = st.flow.processors.filter(proc => proc.id !== updated.id);
      new_procs.push(updated);
      let changed_any = false;
      let connections = st.flow.connections;
      const manifest = st.flow.manifest.processors.find(man => man.type === updated.type);
      if (manifest?.supportsDynamicRelationships) {
        connections =  st.flow.connections.map(out => {
          if (out.source.id !== updated.id) return out;
          let changed = false;
          const newSourceRelationships: {[name: string]: boolean} = {};
          for (const rel in out.sourceRelationships) {
            if (rel in updated.autoterminatedRelationships) {
              newSourceRelationships[rel] = out.sourceRelationships[rel];
              continue;
            }
            // relationship removed
            changed = true;
          }
          for (const rel in updated.autoterminatedRelationships) {
            if (rel in newSourceRelationships) continue;
            // new relationship
            newSourceRelationships[rel] = false;
            changed = true;
          }
          if (!changed) return out;
          changed_any = true;
          return {...out, sourceRelationships: newSourceRelationships};
        });
      }
      if (!changed_any) connections = st.flow.connections;
      return {...st, flow: {...st.flow, processors: new_procs, connections}}
    })
  }, []);

  const updateConnection = React.useCallback((id: Uuid, fn: (curr: Connection)=>Connection)=>{
    setState(st => {
      const curr = st.flow.connections.find(conn => conn.id === id);
      if (!curr) return st;
      const updated = fn(curr);
      const new_conns = st.flow.connections.filter(conn => conn.id !== updated.id);
      new_conns.push(updated);
      return {...st, flow: {...st.flow, connections: new_conns}}
    })
  }, []);

  const updateService = React.useCallback((id: Uuid, fn: (curr: MiNiFiService)=>MiNiFiService)=>{
    setState(st => {
      const curr = st.flow.services.find(serv => serv.id === id);
      if (!curr) return st;
      const updated = fn(curr);
      const new_services = st.flow.services.filter(serv => serv.id !== updated.id);
      new_services.push(updated);
      return {...st, flow: {...st.flow, services: new_services}}
    })
  }, []);

  const closeComponentEditor = React.useCallback(()=>{
    setState(st => ({...st, editingComponent: null}))
  }, [])

  React.useEffect(()=>{
    const flow = PropagateAttributes(state.flow);
    if (flow !== state.flow) setState(curr => ({...curr, flow}));
  }, [state.flow.connections, state.flow.processors]);

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
    setState(st => {
      if (!st.newComponent) return st;
      if (id === null) {
        return {...st, newComponent: null, newConnection: null};
      }
      const procManifest = st.flow.manifest.processors.find(proc => proc.type === id);
      if (!procManifest) {
        return {...st, newComponent: null, newConnection: null};
      }
      const name = getUnqualifiedName(id);
      const newProcessor: Processor = {
        position: {x: st.newComponent.x, y: st.newComponent.y},
        id: uuid.v4() as Uuid,
        name: name,
        type: id,
        penalty: mapDefined(st.flow.manifest.schedulingDefaults.penalizationPeriodMillis, val => `${val} ms`, ""),
        yield: mapDefined(st.flow.manifest.schedulingDefaults.yieldDurationMillis, val => `${val} ms`, ""),
        autoterminatedRelationships: createDefaultRelationshipStatus(procManifest.supportedRelationships),
        scheduling: {
          strategy: mapDefined(st.flow.manifest.schedulingDefaults.defaultSchedulingStrategy, val => `${val}` as any, "TIMER_DRIVEN"),
          concurrentTasks: mapDefined(st.flow.manifest.schedulingDefaults.defaultMaxConcurrentTasks, val => `${val}`, "1"),
          runSchedule: mapDefined(st.flow.manifest.schedulingDefaults.defaultSchedulingPeriodMillis, val => `${val} ms`, ""),
          runDuration: mapDefined(st.flow.manifest.schedulingDefaults.defaultRunDurationNanos, val => `${val} ns`, "")
        },
        properties: createDefaultProperties(procManifest.propertyDescriptors ?? {}),
        visibleProperties: []
      };
      let connections = st.flow.connections;
      if (st.newComponent.srcProcessor) {
        connections = connections.slice();
        connections.push(createDefaultConnection(st.flow, st.newComponent.srcProcessor, newProcessor.id));
      }
      return {...st, flow: {...st.flow, processors: [...st.flow.processors, newProcessor], connections}, newComponent: null, newConnection: null};
    })
  }, []);

  const closeNewService = React.useCallback((id: string|null)=>{
    setState(st => {
      if (!st.newComponent) return st;
      if (id === null) {
        return {...st, newComponent: null};
      }
      const serviceManifest = st.flow.manifest.controllerServices.find(service => service.type === id);
      if (!serviceManifest) {
        return {...st, newComponent: null};
      }
      const name = getUnqualifiedName(id);
      const newSerivce: MiNiFiService = {
        position: {x: st.newComponent.x, y: st.newComponent.y},
        id: uuid.v4() as Uuid,
        name: name,
        type: id,
        properties: createDefaultProperties(serviceManifest.propertyDescriptors ?? {}),
        visibleProperties: []
      };
      return {...st, flow: {...st.flow, services: [...st.flow.services, newSerivce]}, newComponent: null};
    })
  }, [])

  return React.useMemo(()=>({showMenu, moveComponent, deleteComponent, hideMenu, editComponent, updateProcessor, updateConnection, updateService, closeComponentEditor, closeNewProcessor, closeNewService, moveConnection, editable: true}),
    [showMenu, moveComponent, deleteComponent, hideMenu, editComponent, updateProcessor, updateConnection, updateService, closeComponentEditor, closeNewProcessor, closeNewService, moveConnection]);
}

function getUnqualifiedName(name: string) {
  const segments = name.split(".");
  return segments[segments.length - 1];
}

function createDefaultRelationshipStatus(rels: {name: string}[]): {[name: string]: boolean} {
  const result: {[name: string]: boolean} = {};
  for (const {name} of rels) {
    result[name] = false;
  }
  return result;
}

function createDefaultProperties(props: {[name: string]: PropertyDescriptor}): {[name: string]: string|null} {
  console.log(props);
  const result: {[name: string]: string|null} = {};
  for (const name in props) {
    const prop = props[name];
    result[name] = prop.defaultValue ?? null;
  }
  return result;
}

function mapDefined<T, R>(value: T|undefined, fn: (val: T)=>R, fallback: R): R {
  if (value === undefined) return fallback;
  return fn(value);
}

function PropagateAttributes(flow: FlowObject): FlowObject  {
  const errors = new Map<Connection, string[]>();
  const attributes = new Map<Connection, string[]>();
  const visited = new Set<Processor>();
  for (const proc of flow.processors) {
    VerifyProcessor(flow, proc, visited, attributes, errors);
  }
  let changed = false;
  const connections = flow.connections.map(conn => {
    const new_errors = errors.get(conn) ?? [];
    if (new_errors.length !== conn.errors.length || new_errors.some((err, idx) => err !== conn.errors[idx])) {
      changed = true;
    }
    const attr = attributes.get(conn) ?? [];
    if (attr.length !== conn.attributes.length || attr.some((a, idx) => a !== conn.attributes[idx])) {
      changed = true;
    }
    return {...conn, attributes: attr, errors: new_errors};
  });
  if (!changed) return flow;
  return {...flow, connections};
}

function VerifyProcessor(flow: FlowObject, target: Processor, visited: Set<Processor>, attributes: Map<Connection, string[]>, errors: Map<Connection, string[]>) {
  if (visited.has(target)) return;
  visited.add(target);
  const incoming = flow.connections.filter(conn => conn.destination.id === target.id);
  for (const conn of incoming) {
    const src = flow.processors.find(proc => proc.id === conn.source.id)!;
    VerifyProcessor(flow, src, visited, attributes, errors);
  }
  const manifest = flow.manifest.processors.find(proc => proc.type === target.type);
  if (!manifest) return;
  if (manifest.inputAttributeRequirements) {
    for (const req of manifest.inputAttributeRequirements) {
      if (Eval(target, req.condition!)) {
        for (const attr of GetAttributeCandidates(target, manifest, null, req)) {
          for (const conn of incoming) {
            if (!(attributes.get(conn)?.includes(attr))) {
              let err = errors.get(conn);
              if (!err) errors.set(conn, err = []);
              err.push(`Destination processor expects '${attr}' attribute`);
            }
          }
        }
      }
    }
  }
  const outgoing = flow.connections.filter(conn => conn.source.id === target.id);
  const input_attributes = Intersect(incoming.map(conn => attributes.get(conn) ?? [])) ?? [];
  for (const conn of outgoing) {
    const attrs = Intersect(Object.keys(conn.sourceRelationships).filter(rel_name => conn.sourceRelationships[rel_name]).map(rel_name => {
      return DetermineOutputAttributes(target, manifest, input_attributes, rel_name);
    }));
    attributes.set(conn, attrs);
  }
}

function DetermineOutputAttributes(processor: Processor, manifest: ProcessorManifest, input_attrs: string[], rel_name: string): string[] {
  const rel = manifest.supportedRelationships.find(rel => rel.name === rel_name);
  let attr_descriptors: AttributeDescriptor[]|undefined = undefined;
  if (rel) {
    attr_descriptors = rel.outputAttributes;
  } else {
    // dynamic property
    attr_descriptors = manifest.dynamicRelationshipAttributes;
  }
  if (!attr_descriptors) return [];

  const output: string[] = [];

  for (const desc of attr_descriptors) {
    const candidates = GetAttributeCandidates(processor, manifest, input_attrs, desc);

    if (Eval(processor, desc.condition!) === true) {
      for (const attr of candidates) {
        if (!output.includes(attr)) output.push(attr);
      }
    }
  }
  return output;
}

function GetAttributeCandidates(processor: Processor, manifest: ProcessorManifest, input_attrs: string[]|null, desc: AttributeDescriptor): string[] {
  let output: string[] = [];
  if (desc.source === "InputAttributes") {
    if (input_attrs === null) {
      console.warn("This does not make sense in this context");
    } else {
      output = [...input_attrs];
    }
  } else if (desc.source === "DynamicProperties") {
    for (const prop in processor.properties) {
      if (prop in manifest.supportedRelationships) continue;
      if (!output.includes(prop)) {
        output.push(prop);
      }
    }
  } else if (desc.source === "Property") {
    const val = processor.properties[desc.value];
    if (val) output = [val];
  } else {
    output = [...desc.source];
  }
  return output;
}

function Intersect(sets: string[][]): string[] {
  let result = sets[0];
  for (let idx = 1; idx < sets.length; ++idx) {
    result = result.filter(val => sets[idx].includes(val));
  }
  return result;
}