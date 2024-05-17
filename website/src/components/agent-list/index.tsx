import { useContext, useState } from "react";
import * as React from "react";
import { ServiceContext } from "../../common/service-context";
import { Agent } from "../agent";

import "./index.scss";
import { Filter, FilterWidget } from "../filter";

export function AgentList() {
  const services = useContext(ServiceContext);
  const [agents, setAgents] = useState<AgentLike[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<AgentLike[]>([]);
  const [filter, setFilter] = useState<Filter>(new Filter());
  React.useEffect(()=>{
    let mounted = true;
    services!.agents.fetchAll().then(agents => {
      if (!mounted) return;
      setAgents(agents);
    })
    return ()=>{mounted = false;}
  }, [])
  React.useEffect(()=>{
    setFilteredAgents(agents.filter(agent => filter.match(agent)).sort((a, b)=>{
      if (a.last_heartbeat !== null && b.last_heartbeat !== null) {
        return b.last_heartbeat.getTime() - a.last_heartbeat.getTime();
      }
      return a.id < b.id ? -1 : (a.id === b.id ? 0 : 1);
    }));
  }, [agents, filter])
  return <div className="agents">
    <FilterWidget placeholder="Filter agents..." onFilterChange={setFilter}/>
    {
      filteredAgents.map(agent => <Agent key={agent.id} value={agent} />)
    }
  </div>;
}