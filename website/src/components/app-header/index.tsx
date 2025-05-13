import * as React from "react";
import { useLocation, useNavigate } from "react-router";

import "./index.scss";
import { ThemeContext } from "../../../src/common/theme-context";
import { LightIcon } from "../../../src/icons/light";
import { DarkIcon } from "../../../src/icons/dark";

function ThemeButton() {
  const theme = React.useContext(ThemeContext);
  return <div className="p-2 cursor-pointer mr-2" onClick={()=>{theme.toggle()}}>
    {
      theme.current === 'light' ? <LightIcon className="fill-blue-400" size={18} /> : <DarkIcon className="fill-blue-400" size={18} />
    }
  </div>
}

export function AppHeader() {
  const path = useLocation().pathname;
  const navigate = useNavigate();
  return <div className="app-header">
    <div className={`item ${path === '/agents' ? 'active' : ''}`} onClick={()=>navigate("/agents")}>Agents</div>
    <div className={`item ${path === '/agent-classes' ? 'active' : ''}`} onClick={()=>navigate("/agent-classes")}>Classes</div>
    <div className={`item ${path === '/flows' ? 'active' : ''}`} onClick={()=>navigate("/flows")}>Flows</div>
    <div className="flex-1"/>
    <ThemeButton />
  </div>;
}