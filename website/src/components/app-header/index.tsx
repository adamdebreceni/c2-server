import * as React from "react";
import { useLocation, useNavigate } from "react-router";

import "./index.scss";

export function AppHeader() {
  const path = useLocation().pathname;
  const navigate = useNavigate();
  return <div className="app-header">
    <div className={`item ${path === '/agents' ? 'active' : ''}`} onClick={()=>navigate("/agents")}>Agents</div>
    <div className={`item ${path === '/agent-classes' ? 'active' : ''}`} onClick={()=>navigate("/agent-classes")}>Classes</div>
    <div className={`item ${path === '/flows' ? 'active' : ''}`} onClick={()=>navigate("/flows")}>Flows</div>
  </div>;
}