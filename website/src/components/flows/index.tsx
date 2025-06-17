import {useContext, useEffect, useState} from "react";
import * as React from "react";
import {ServiceContext} from "../../common/service-context";
import {FlowPreview} from "../flow-preview";

import "./index.scss";
import {ImportModal} from "../import-modal";
import {ModalContext} from "../../common/modal-context";
import { Fill } from "../fill/Fill";

export function Flows() {
  const services = useContext(ServiceContext);
  const openModal = useContext(ModalContext);
  const [flows, setFlows] = useState<{items: FlowLike[], graph: React.ReactNode|null}>({items: [], graph: null});
  const [agents, setAgents] = useState<AgentLike[]|null>(null);
  const [agentClasses, setAgentClasses] = useState<AgentClassLike[]|null>(null);
  useEffect(() => {
    let isMounted = true;
    services!.flows.fetchAll().then(flows => {
      if (!isMounted) return;
      setFlows({items: flows, graph: generateFlowGraph(flows)});
    })
    return () => {
      isMounted = false
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    services!.agents.fetchAll().then(agents => {
      if (!isMounted) return;
      setAgents(agents);
    })
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true;
    services!.agents.fetchClasses().then(classes => {
      if (!isMounted) return;
      setAgentClasses(classes);
    })
    return () => {
      isMounted = false
    }
  }, []);

  if (!agents || !agentClasses) {
    return null;
  }

  // const list_ref = React.useRef<HTMLDivElement|null>(null);
  // const bg_ref = React.useRef<HTMLDivElement|null>(null);

  // useEffect(() => {
  //   const list = list_ref.current;
  //   const bg = bg_ref.current;
  //   if (!list || !bg) return;

  //   const handle_move = (e: MouseEvent) => {
  //     let offset = e.clientY - (list.getBoundingClientRect().top - list.scrollTop) - 20;
  //     if (offset < 0)
  //     offset = Math.floor(Math.max(offset - 20, 0) / 40) * 40;
  //     bg.style.top = `${offset + 20}px`;
  //     bg.classList.add('active');
  //   }

  //   const handle_leave = (e: MouseEvent) => {
  //     bg.classList.remove('active');
  //   }

  //   list.addEventListener('mousemove', handle_move);
  //   list.addEventListener('mouseleave', handle_leave);
  //   return () => {
  //     list.removeEventListener('mousemove', handle_move);
  //     list.removeEventListener('mouseleave', handle_leave);
  //     bg.classList.remove('active');
  //   }
  // }, [list_ref.current, bg_ref.current]);

  const agent_count = new Map<string, number>();
  for (const agent of agents) {
    if (agent.flow) {
      agent_count.set(agent.flow, (agent_count.get(agent.flow) ?? 0) + 1);
    }
  }

  const agent_class_count = new Map<string, string[]>();
  for (const clazz of agentClasses) {
    if (clazz.flow) {
      if (!agent_class_count.has(clazz.flow)) {
        agent_class_count.set(clazz.flow, []);
      }
      agent_class_count.get(clazz.flow)?.push(clazz.name);
    }
  }
  
  return <div className="flow-list-container">
    <div className="flow-list">
      <Fill/>
      <div className="flow-graph">
        {flows.graph}
      </div>
      <div className="flow-entries">
        {flows.items.map(flow => <FlowPreview key={flow.id} value={flow}
            agentCount={agent_count.get(flow.id) ?? 0}
            classes={agent_class_count.get(flow.id) ?? []}
            />)}
      </div>
      <Fill/>
      <div className="flow-bg" />
    </div>
    <div className="footer">
      <div className="open-import"
        onClick={() => openModal(<ImportModal onImport={async (class_str, flow_str) =>
        {
          await services!.flows.import(class_str, flow_str);
          const updatedFlows = await services!.flows.fetchAll();
          setFlows({items: updatedFlows, graph: generateFlowGraph(updatedFlows)});
          openModal(null as any);
        }} />)}>
        <span className="label">Import</span>
      </div>
    </div>
  </div>
}

function generateFlowGraph(flows: FlowLike[]): React.ReactNode {
  const entry_size = 40;
  const col_gap = 15;
  const r = 5;

  const colors = [
    'var(--highlight-lightblue)',
    'var(--highlight-green)',
    'var(--highlight-orange)',
    'var(--highlight-purple)',
    'var(--highlight-yellow)',
    'var(--highlight-teal)',
  ];

  const children: React.ReactNode[] = [];

  let max_col = 0;

  // unterminated heads of chains
  const chains: ({flow: FlowLike, idx: number} | null)[] = [];
  for (let flow_idx = 0; flow_idx < flows.length; ++flow_idx) {
    let col_idx = 0
    for (; col_idx < chains.length; ++col_idx) {
      if (chains[col_idx]?.flow.parent === flows[flow_idx].id) {
        for (let prev_col_idx = 0; prev_col_idx < chains.length; ++prev_col_idx) {
          if (chains[prev_col_idx]?.flow.parent === flows[flow_idx].id) {
            // children.push(<path d={`M ${col_idx * col_gap} ${flow_idx * entry_size} L ${prev_col_idx * col_gap} ${flow_idx * entry_size - entry_size / 2} L ${prev_col_idx * col_gap} ${chains[prev_col_idx]!.idx * entry_size}`} fill="none" strokeWidth="3" stroke="red" />);
            children.push(<path d={`M ${col_idx * col_gap} ${flow_idx * entry_size} C ${col_idx * col_gap} ${flow_idx * entry_size - entry_size / 4} ${prev_col_idx * col_gap} ${flow_idx * entry_size - entry_size / 2 + entry_size / 4} ${prev_col_idx * col_gap} ${flow_idx * entry_size - entry_size / 2} L ${prev_col_idx * col_gap} ${chains[prev_col_idx]!.idx * entry_size}`} fill="none" strokeWidth="3" stroke={colors[prev_col_idx % colors.length]} />);
            chains[prev_col_idx] = null;  // terminate this chain
          }
        }
        break;
      }
    }
    if (col_idx === chains.length) {
      // this is the start of a brand new chain
      col_idx = chains.indexOf(null);
      if (col_idx === -1) {
        col_idx = chains.length;
      }
    }
    children.push(<circle cx={col_idx * col_gap} cy={flow_idx * entry_size} r={r} fill={colors[col_idx % colors.length]} />);
    if (flows[flow_idx].parent !== null) {
      // this chain continues
      chains[col_idx] = {flow: flows[flow_idx], idx: flow_idx};
    } else {
      chains[col_idx] = null;
    }

    let col_count = 0;
    for (let idx = 0; idx < chains.length; ++idx) {
      if (chains[idx]) {
        col_count = idx;
      }
    }
    max_col = Math.max(max_col, col_count);
  }

  return <svg width={max_col * col_gap + 2 * r} height={(flows.length - 1) * entry_size + 2 * r} viewBox={`-${r} -${r} ${max_col * col_gap + 2 * r} ${(flows.length - 1) * entry_size + 2 * r}`} xmlns="http://www.w3.org/2000/svg">
    {children}
  </svg>
}