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
  deg: number,
  to: {x: number, y: number} | Uuid | null
};

interface FlowEditorState {
  saved: boolean,
  flow: FlowObject
  menu: {position: {x: number, y: number}, items: {name: string, on: ()=>void}[]}|null
  panning: boolean,
  editingComponent: Processor | Connection | MiNiFiService| null,
  newConnection: NewConnection | null,
  newComponent: {x: number, y: number, type: "PROCESSOR"|"SERVICE"} | null,
  publish: boolean
}

const hw = 25;

export function FlowEditor(props: {id: string, flow: FlowObject}) {
  const [state, setState] = useState<FlowEditorState>({saved: true, publish: false, flow: props.flow, panning: false, menu: null, editingComponent: null, newConnection: null, newComponent: null});
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
            return {...st, newConnection: {...st.newConnection, to: proc.id}};
          }
          return {...st, newConnection: {...st.newConnection, to: {x, y}}}
        }
        if (!st.panning) {
          if (st.menu) return st;
          const {x, y} = toAreaCoords(areaRef, st, e);
          const proc = findConnSourceProc(st, {x, y});
          if (!proc) {
            if (!st.newConnection) return st;
            return {...st, newConnection: null}
          }
          const deg = Math.atan2(y - (proc.position.y + hw), x - (proc.position.x + hw));
          return {...st, newConnection: {source: proc.id, deg, to: null}};
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
          // create new connection
          const proc = st.flow.processors.find(proc => proc.id === st.newConnection!.source)!;
          const rels: {[name: string]: boolean} = {};
          for (const rel in proc.autoterminatedRelationships) {
            rels[rel] = false;
          }
          const manifest = st.flow.manifest.processors.find(proc_manifest => proc_manifest.type === proc.type);
          if (manifest?.supportsDynamicRelationships) {
            for (const prop in proc.properties) {
              if (!manifest.propertyDescriptors || !(prop in manifest.propertyDescriptors)) {
                rels[prop] = false;
              }
            }
          }
          const newConn: Connection = {
            id: uuid.v4() as Uuid,
            name: null,
            source: {id: st.newConnection.source, port: null},
            sourceRelationships: rels,
            destination: {id: st.newConnection.to, port: null},
            flowFileExpiration: "0 seconds",
            backpressureThreshold: {count: "10000", size: "10 MB"},
            swapThreshold: null,
            errors: [],
            attributes: []
          }
          return {...st, flow: {...st.flow, connections: [...st.flow.connections, newConn]}, newConnection: null};
        }
        const {x, y} = toAreaCoords(areaRef, st, e);
        let newConnection: NewConnection | null = null;
        const proc = findConnSourceProc(st, {x, y});
        if (proc) {
          const deg = Math.atan2(y - (proc.position.y + hw), x - (proc.position.x + hw));
          newConnection = {source: proc.id, deg, to: null};
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
  }, [flowContext.showMenu, flowContext.hideMenu])

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
            return <ConnectionView model={conn} key={conn.id} id={conn.id} from={{x: srcProc.position.x + hw, y: srcProc.position.y + hw}}
              to={{x: dstProc.position.x + hw, y: dstProc.position.y + hw}}
              name={conn.name ? conn.name : Object.keys(conn.sourceRelationships).filter(key => conn.sourceRelationships[key]).sort().join(", ")}/>
          })
        }
        {
          !(state.newConnection?.to) ? null : (()=>{
            const src = state.flow.processors.find(proc => proc.id === state.newConnection!.source)!;
            let to: {x: number, y: number};
            if (typeof state.newConnection.to === "string") {
              const dest = state.flow.processors.find(proc => proc.id === state.newConnection!.to)!;
              to = {x: dest.position.x + hw, y: dest.position.y + hw};
            } else {
              to = state.newConnection.to as any;
            }
            return <ConnectionView from={{x: src.position.x + hw, y: src.position.y + hw}} to={to} exactEnd={typeof state.newConnection.to !== "string"}/>
          })()
        }
        {
          state.flow.processors.map(proc => <Widget key={proc.id} highlight={state.newConnection?.to === proc.id} value={proc} deg={state.newConnection?.source === proc.id && !state.newConnection.to ? state.newConnection.deg : undefined}/>)
        }
        {
          state.flow.services.map(service => <Widget key={service.id} value={service} service />)
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
                return <ProcessorEditor model={state.editingComponent as Processor} manifest={proc_manifest} />
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
    const d = Math.sqrt((proc.position.x + hw - pos.x) ** 2 + (proc.position.y + hw - pos.y) ** 2);
    return d > 20 && d < 60;
  })
}

function findConnDestProc(st: FlowEditorState, pos: {x: number, y: number}) {
  return st.flow.processors.find(proc => {
    const d = Math.sqrt((proc.position.x + hw - pos.x) ** 2 + (proc.position.y +hw - pos.y) ** 2);
    if (proc.id !== st.newConnection!.source) {
      return d < 80;
    } else {
      return d < 25;
    }
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

  const updateProcessor = React.useCallback((updated: Processor)=>{
    setState(st => {
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
            if (rel in updated.properties) {
              newSourceRelationships[rel] = out.sourceRelationships[rel];
              continue;
            }
            // relationship removed
            changed = true;
          }
          for (const rel in updated.properties) {
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

  const updateConnection = React.useCallback((updated: Connection)=>{
    setState(st => {
      const new_conns = st.flow.connections.filter(conn => conn.id !== updated.id);
      new_conns.push(updated);
      return {...st, flow: {...st.flow, connections: new_conns}}
    })
  }, []);

  const updateService = React.useCallback((updated: MiNiFiService)=>{
    setState(st => {
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
        return {...st, newComponent: null};
      }
      const procManifest = st.flow.manifest.processors.find(proc => proc.type === id);
      if (!procManifest) {
        return {...st, newComponent: null};
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
        properties: createDefaultProperties(procManifest.propertyDescriptors ?? {})
      };
      return {...st, flow: {...st.flow, processors: [...st.flow.processors, newProcessor]}, newComponent: null};
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
        properties: createDefaultProperties(serviceManifest.propertyDescriptors ?? {})
      };
      return {...st, flow: {...st.flow, services: [...st.flow.services, newSerivce]}, newComponent: null};
    })
  }, [])

  return React.useMemo(()=>({showMenu, moveComponent, deleteComponent, hideMenu, editComponent, updateProcessor, updateConnection, updateService, closeComponentEditor, closeNewProcessor, closeNewService}),
    [showMenu, moveComponent, deleteComponent, hideMenu, editComponent, updateProcessor, updateConnection, updateService, closeComponentEditor, closeNewProcessor, closeNewService]);
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