import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { NotificationContext } from "../../common/notification-context";
import { ServiceContext } from "../../common/service-context";
import { Center } from "../center";
import { JsonView } from "../json-viewer";
import { Loader } from "../loader";
import "./index.scss"

export function AgentDetail() {
  const services = useContext(ServiceContext);
  const notif = useContext(NotificationContext)
  const agentId = useParams<any>()["id"]!;
  const navigate = useNavigate();
  const [agent, setAgent] = useState<{value: AgentLike, manifest: JsonValue, flow_info: JsonValue, response: JsonValue}|null|undefined>(undefined);
  const mounted = React.useRef<boolean>(true);
  useEffect(()=>{
    services!.agents.fetchAgentInformation(agentId).then(new_agent => {
      if (!mounted.current) return;
      if (new_agent) {
        let manifest: AgentManifest|null = null;
        try {
          console.log("Parsing manifest: ", new_agent.manifest);
          manifest = JSON.parse(new_agent.manifest ?? "null");
        } catch (e) {
          notif.emit("Failed to parse agent manifest", "error");
        }
        let flow_info: FlowInfo|null = null;
        try {
          console.log("Parsing flow info: ", new_agent.flow_info);
          flow_info = JSON.parse(new_agent.flow_info ?? "null");
        } catch (e) {
          notif.emit("Failed to parse flow info", "error");
        }
        setAgent({value: new_agent, manifest, flow_info, response: null});
      } else {
        setAgent(null);
      }
    })
    return ()=>{mounted.current = false;}
  }, [agentId])
  const req_widget = React.useRef<HTMLTextAreaElement|null>(null);
  const req_cb = React.useCallback(()=>{
    if (!agent?.value.id || !req_widget.current) return;
    let data: JsonValue;
    try {
      data = JSON.parse(req_widget.current.value);
    } catch (e) {
      setAgent(curr => {
        if (!curr) return curr;
        return {...curr, response: "Failed to parse request"};
      });
      return;
    }
    setAgent(curr => {
      if (!curr) return curr;
      return {...curr, response: "<PENDING>"}
    })
    services!.agents.sendRequest(agent!.value.id, data).then(response => {
      if (!mounted.current) return;
      console.log(`Got response: "${response}"`)
      try {
        const json = JSON.parse(response);
        setAgent(curr => {
          if (!curr) return curr;
          return {...curr, response: json};
        })
      } catch (e) {
        console.error(`Failed to parse response`);
        setAgent(curr => {
          if (!curr) return curr;
          return {...curr, response};
        })
      }
    });
  }, [agent?.value.id])
  return agent === undefined ? <Center><Loader/></Center> :
    agent === null ? null :
    <div className="agent-detail">
      <div className="basic">
        <div className="property id"><div className="name">Identifier</div><div className="value">{agent.value.id}</div></div>
        <div className="property class"><div className="name">Class</div><div className="value">{agent.value.class}</div></div>
        <div className="property flow"><div className="name">Flow</div><div className="value" onClick={()=>{
          if (agent.value.flow) {
            services?.flows.fetch(agent.value.flow).then(flow=>{
              if (!flow) {
                notif.emit(`Flow ${agent.value.flow} is not available`, "error");
              } else {
                navigate(`/agent/${agent.value.id}/flow`)
              }
            })
          } else {
            services?.flows.create({agent: agent.value.id}).then(id => {
              navigate(`/flow/${id}`);
            })
          }
        }}>{agent.value.flow}</div></div>
      </div>
      <div className="tab"><div className="title">Manifest</div><div className="content"><JsonView value={agent.manifest}/></div></div>
      <div className="tab"><div className="title">FlowInfo</div><div className="content"><JsonView value={agent.flow_info}/></div></div>
      <div className="tab request">
        <div className="title">Request
        </div>
        <div className="content">
          <textarea ref={req_widget} className="border border-gray-400 focus:border-blue-600 w-full h-40 resize-none"/>
        </div>
        <SendButton onClick={req_cb} />
        <div className="title">Response</div>
        <div className="content">{
          agent.response === "<PENDING>" ? <Center><Loader/></Center> :
          <JsonView value={agent.response}/>
        }</div>
      </div>
    </div>;
}

function SendButton(props: {onClick: ()=>void}) {
  return <div className="inline-block items-center justify-center
    hover:bg-blue-800 hover:text-white text-blue-900 bg-blue-100 text-sm
    cursor-pointer px-10 py-3 rounded-[3px] ml-4" onClick={props.onClick}>Send</div>
}