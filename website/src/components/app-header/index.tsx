import * as React from "react";
import { useHistory } from "react-router";

import "./index.scss";

export function AppHeader() {
  const history = useHistory();
  return <div className="app-header">
    <div className="item" onClick={()=>history.push("/agents")}>Agents</div>
    <div className="item" onClick={()=>history.push("/agent-classes")}>Classes</div>
    <div className="item" onClick={()=>history.push("/flows")}>Flows</div>
  </div>;
}