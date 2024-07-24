import * as React from "react";
import { useNavigate } from "react-router";

import "./index.scss";

export function AppHeader() {
  const navigate = useNavigate();
  return <div className="app-header">
    <div className="item" onClick={()=>navigate("/agents")}>Agents</div>
    <div className="item" onClick={()=>navigate("/agent-classes")}>Classes</div>
    <div className="item" onClick={()=>navigate("/flows")}>Flows</div>
  </div>;
}