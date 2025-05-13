import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { ServiceContext } from "../../common/service-context";
import { Loader } from "../loader";
import "./index.scss";
import { SuccessIcon } from "../../icons/success";
import { Tooltip } from "../tooltip";
import { ErrorIcon } from "../../icons/error";
import { Link } from "react-router";

export function PublishModal(props: {state: PublishState, setPublishState: (fn: (curr: PublishState)=>PublishState)=>void, onCancel: ()=>void, onPublish?: (agents: string[], classes: string[])=>void}) {
  const services = useContext(ServiceContext);

  const onToggle = React.useCallback((item: AgentState | ClassState)=>{
    props.setPublishState(st => {
      if (!st) return st;
      return Toggle(st, item);
    })
  }, [props.setPublishState])

  return <div className="publish-modal popout">
    <div className="header">Agents</div>
    <div className="agent-list"><div className="agent-list-inner">{
      (()=>{
        if (props.state === null) return <Loader/>
        return <>
          {props.state.classes.map(clazz => <ClassInstance key={clazz.id} targetFlow={props.state.targetFlow} model={clazz} onToggle={onToggle}/>)}
          {props.state.agents.map(agent => <AgentInstance key={agent.id} targetFlow={props.state.targetFlow} model={agent} onToggle={onToggle}/>)}
        </>
      })()
    }</div></div>
    {props.onPublish ? <div className="footer">
      <div className="cancel" onClick={props.onCancel}>Cancel</div>
      <div className="publish" onClick={()=>{
        const agents: string[] = props.state!.agents.filter(agent => agent.selected).map(agent => agent.id);
        const classes: string[] = props.state!.classes.filter(clazz => clazz.selected).map(clazz => clazz.id);
        for (const clazz of props.state!.classes) {
          if (!clazz.selected) {
            agents.push(...clazz.agents.filter(agent => agent.selected).map(agent => agent.id));
          }
        }
        props.onPublish!(agents, classes)
      }}>
        <span className="label">Publish</span>
        <div className="publish-loader"/>
      </div>
    </div>
    : null}
  </div>
}

function AgentInstance(props: {targetFlow: string|null, model: AgentState, onToggle?: (item: AgentState|ClassState)=>void}) {
  return <div className="agent-instance instance">
    <div className="instance-header">
      <ToggleWidget value={props.model.selected} toggle={props.onToggle ? ()=>props.onToggle!(props.model) : undefined}/>
      <div className="name">{props.model.id}</div>
      {
        (()=>{
          if (!props.model.selected) return null;
          if (!props.targetFlow) return null;
          if (props.model.flow === props.targetFlow) {
            return <>
              <SuccessIcon size={20} />
              <div className="go-to-flow"><Link to={`/agent/${props.model.id}/flow`}>{props.model.flow.substring(0, 8)}</Link></div>
            </>
          }
          if (props.model.flow_update_error?.target_flow === props.targetFlow) {
            return <ErrorIcon size={20} />
          }
          return <div className="agent-publish-loader" />
        })()
      }
    </div>
    {
      (()=>{
        if (!props.targetFlow) return null;
        if (props.model.flow === props.targetFlow) return null;
        if (props.model.flow_update_error?.target_flow === props.targetFlow) {
          return <div className="update-error"><div>{props.model.flow_update_error.error}</div></div>
        }
      })()
    }
  </div>
}

function ClassInstance(props: {targetFlow: string|null, model: ClassState, onToggle?: (item: AgentState|ClassState)=>void}) {
  const [state, setState] = useState<boolean>(false);
  return <div className="class-instance instance">
    <div className="class-header instance-header">
      <ToggleWidget value={props.model.selected} toggle={props.onToggle ? ()=>props.onToggle!(props.model) : undefined} />
      { state ? <div className="close class-expand-icon" onClick={()=>setState(curr => !curr)}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
        </div> :
        <div className="open class-expand-icon" onClick={()=>setState(curr => !curr)}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
        </div>
      }
      <div className="name">{props.model.id}</div>
      {
        (()=>{
          if (!props.model.selected) return null;
          if (!props.targetFlow) return null;
          if (props.model.agents.every(agent => agent.flow === props.targetFlow)) {
            return <SuccessIcon size={20} />
          }
          if (props.model.agents.some(agent => agent.flow_update_error?.target_flow === props.targetFlow)) {
            return <ErrorIcon size={20} />
          }
          return <div className="agent-publish-loader" />
        })()
      }
    </div>
    {
      !state ? null : <div className="class-agents">{
        props.model.agents.map(agent => <AgentInstance key={agent.id} targetFlow={props.targetFlow} model={agent} onToggle={props.onToggle}/>)
      }</div>
    }
  </div>
}

function Toggle(st: PublishState, target: AgentState|ClassState): PublishState {
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

function ToggleWidget(props: {value: boolean, toggle?: ()=>void}) {
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