import { useContext, useState } from "react";
import * as React from "react";
import { ServiceContext } from "../../common/service-context";
import { AgentClass } from "../agent-class";

import "./index.scss";
import { Filter, FilterWidget } from "../filter";

export function AgentClasses() {
  const services = useContext(ServiceContext);
  const [agentClasses, setAgentClasses] = useState<AgentClassLike[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<AgentClassLike[]>([]);
  const [filter, setFilter] = useState<Filter>(new Filter());
  React.useEffect(()=>{
    let mounted = true;
    services!.agents.fetchClasses().then(classes => {
      if (!mounted) return;
      setAgentClasses(classes);
    })
    return ()=>{mounted = false;}
  }, [])
  React.useEffect(()=>{
    setFilteredClasses(agentClasses.filter(agent => filter.match(agent)));
  }, [agentClasses, filter])
  return <div className="agent-classes">
    <FilterWidget placeholder="Filter classes..." onFilterChange={setFilter} />
    {
      filteredClasses.map(agentClass => <AgentClass key={agentClass.name} value={agentClass} />)
    }
  </div>;
}