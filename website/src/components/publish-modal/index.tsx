import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { ServiceContext } from "../../common/service-context";
import { Loader } from "../loader";
import "./index.scss";

interface AgentState {
  type: "agent"
  id: string
  class: string|null
  selected: boolean
  last_heartbeat: Date|null
}

interface ClassState {
  type: "class"
  id: string
  selected: boolean
  agents: AgentState[]
}

interface PublishModalState {
  classes: ClassState[]
  agents: AgentState[]
}

export function PublishModal(props: {onCancel: ()=>void, onPublish: (agents: string[], classes: string[])=>void}) {
  const [state, setState] = useState<PublishModalState|null>(null);
  const services = useContext(ServiceContext);
  useEffect(()=>{
    let mounted = true;
    services?.agents.fetchAll().then(agents => {
      if (!mounted) return;
      const newState: PublishModalState = {agents: [], classes: []};
      for (const agent of agents) {
        if (typeof agent.class !== "string") {
          newState.agents.push({type: "agent", id: agent.id, class: null, selected: false, last_heartbeat: agent.last_heartbeat});
        } else {
          let clazz = newState.classes.find(clazz => clazz.id === agent.class);
          if (!clazz) {
            clazz = {type: "class", id: agent.class!, selected: false, agents: []};
            newState.classes.push(clazz);
          }
          clazz.agents.push({type: "agent", id: agent.id, class: agent.class, selected: false, last_heartbeat: agent.last_heartbeat});
        }
      }
      newState.agents = newState.agents.sort((a, b) => StringCmp(a.id, b.id));
      newState.classes = newState.classes.map(clazz => ({...clazz, agents: clazz.agents.sort((a, b)=>StringCmp(a.id, b.id))})).sort((a, b)=> StringCmp(a.id, b.id));
      setState(newState);
    })
    return ()=>{
      mounted = false;
    }
  }, []);

  const onToggle = React.useCallback((item: AgentState | ClassState)=>{
    setState(st => {
      if (!st) return st;
      return Toggle(st, item);
    })
  }, [])

  return <div className="publish-modal">
    <div className="header">Agents</div>
    <div className="agent-list"><div className="agent-list-inner">{
      (()=>{
        if (state === null) return <Loader/>
        return <>
          {state.classes.map(clazz => <ClassInstance key={clazz.id} model={clazz} onToggle={onToggle}/>)}
          {state.agents.map(agent => <AgentInstance key={agent.id} model={agent} onToggle={onToggle}/>)}
        </>
      })()
    }</div></div>
    <div className="footer">
      <div className="cancel" onClick={props.onCancel}>CANCEL</div>
      <div className="publish" onClick={()=>{
        const agents: string[] = state!.agents.filter(agent => agent.selected).map(agent => agent.id);
        const classes: string[] = state!.classes.filter(clazz => clazz.selected).map(clazz => clazz.id);
        for (const clazz of state!.classes) {
          if (!clazz.selected) {
            agents.push(...clazz.agents.filter(agent => agent.selected).map(agent => agent.id));
          }
        }
        props.onPublish(agents, classes)
      }}>PUBLISH</div>
    </div>
  </div>
}

function StringCmp(a: string, b: string) {
  if (a < b) return -1;
  if (a === b) return 0;
  return 1;
}

function AgentInstance(props: {model: AgentState, onToggle: (item: AgentState|ClassState)=>void}) {
  return <div className="agent-instance instance">
    <div className="instance-header">
      <ToggleWidget value={props.model.selected} toggle={()=>props.onToggle(props.model)}/>
      <div className="name">{props.model.id}</div>
    </div>
  </div>
}

function ClassInstance(props: {model: ClassState, onToggle: (item: AgentState|ClassState)=>void}) {
  const [state, setState] = useState<boolean>(false);
  return <div className="class-instance instance">
    <div className="class-header instance-header">
      <ToggleWidget value={props.model.selected} toggle={()=>props.onToggle(props.model)} />
      { state ? <div className="close class-expand-icon" onClick={()=>setState(curr => !curr)}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
        </div> :
        <div className="open class-expand-icon" onClick={()=>setState(curr => !curr)}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
        </div>
      }
      <div className="name">{props.model.id}</div>
    </div>
    {
      !state ? null : <div className="class-agents">{
        props.model.agents.map(agent => <AgentInstance key={agent.id} model={agent} onToggle={props.onToggle}/>)
      }</div>
    }
  </div>
}

function Toggle(st: PublishModalState, target: AgentState|ClassState): PublishModalState {
  if (target.type === "agent") {
    if (target.class !== null) {
      const classIdx = st.classes.findIndex(clazz => clazz.id === target.class);
      if (classIdx === -1) {
        console.error(`Unknown class "${target.id}"`)
        return st;
      }
      const newClasses = st.classes.slice();
      newClasses[classIdx] = {...newClasses[classIdx], agents: ToggleAgent(newClasses[classIdx].agents, target)};
      if (newClasses[classIdx].agents.some(agent => !agent.selected)) newClasses[classIdx].selected = false;
      return {...st, classes: newClasses};
    } else {
      return {...st, agents: ToggleAgent(st.agents, target)};
    }
  }
  // toggle class
  const classIdx = st.classes.findIndex(clazz => clazz.id === target.id);
  if (classIdx === -1) {
    console.error(`Unknown class "${target.id}"`)
    return st;
  }
  const newClasses = st.classes.slice();
  newClasses[classIdx] = {...newClasses[classIdx], selected: !newClasses[classIdx].selected};
  // toggle all agents on
  newClasses[classIdx].agents = newClasses[classIdx].agents.map(agent => ({...agent, selected: newClasses[classIdx].selected}));
  return {...st, classes: newClasses};
}
    
function ToggleAgent(agents: AgentState[], target: AgentState): AgentState[] {
  const agentIdx = agents.findIndex(agent => agent.id === target.id);
  if (agentIdx === -1) {
    console.error(`Unknown agent "${target.id}"`)
    return agents;
  }
  const newAgents = agents.slice();
  newAgents[agentIdx] = {...newAgents[agentIdx], selected: !newAgents[agentIdx].selected};
  return newAgents;
}

function ToggleWidget(props: {value: boolean, toggle: ()=>void}) {
  return <div className={`toggle-widget ${props.value ? "active" : ""}`} onClick={props.toggle}>
    {
      !props.value ? null : <div className="checkmark-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 24 24" fill="black" width="14px" height="14px">
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" strokeWidth="10"/>
        </svg>
      </div>
    }
  </div>
}