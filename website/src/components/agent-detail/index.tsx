import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import { NotificationContext } from "../../common/notification-context";
import { ServiceContext } from "../../common/service-context";
import { Center } from "../center";
import { JsonView } from "../json-viewer";
import { Loader } from "../loader";
import "./index.scss"

export function AgentDetail() {
  const services = useContext(ServiceContext);
  const notif = useContext(NotificationContext)
  const flowId = useParams<any>()["id"];
  const [agent, setAgent] = useState<{value: AgentLike, manifest: JsonValue, response: JsonValue}|null|undefined>(undefined);
  const mounted = React.useRef<boolean>(true);
  useEffect(()=>{
    services!.agents.fetchAgentInformation(flowId).then(new_agent => {
      if (!mounted.current) return;
      if (new_agent) {
        let manifest: JsonValue = null;
        try {
          console.log("Parsing manifest: ", new_agent.manifest);
          manifest = JSON.parse(new_agent.manifest ?? "null");
        } catch (e) {
          notif.emit("Failed to parse agent manifest", "error");
        }
        setAgent({value: new_agent, manifest, response: null});
      } else {
        setAgent(null);
      }
    })
    return ()=>{mounted.current = false;}
  }, [flowId])
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
        <div className="property flow"><div className="name">Flow</div><div className="value">{agent.value.flow}</div></div>
      </div>
      <div className="tab"><div className="title">Manifest</div><div className="content"><JsonView value={agent.manifest}/></div></div>
      <div className="tab">
        <div className="title">Request
          <SendButton onClick={req_cb} />
        </div>
        <div className="content">
          <textarea ref={req_widget} className="border border-gray-500 w-full h-40 resize-none"/>
        </div>
        <div className="title">Response</div>
        <div className="content">{
          agent.response === "<PENDING>" ? <Center><Loader/></Center> :
          <JsonView value={agent.response}/>
        }</div>
      </div>
    </div>;
}

function SendButton(props: {onClick: ()=>void}) {
  return <div className="flex items-center justify-center
    hover:bg-blue-600 text-white bg-blue-400 text-sm
    cursor-pointer px-4 py-2 rounded-full ml-4" onClick={props.onClick}>Send</div>
}