import * as React from "react";
import { useCallback, useState } from "react"
import { NotificationContext } from "../../common/notification-context";

import "./index.scss";

let id = 1;

export function NotificationLayer(props: {children: React.ReactChild[]|React.ReactChild}) {
  const [state, setState] = useState<{id: number, msg: string, type: "success"|"error"}[]>([]);
  const context = React.useMemo(()=>({
    emit: (msg: string, type: "success"|"error") => {
      setState(st => [...st, {id: id++, msg, type}]);
    }
  }), []);
  const destroy = useCallback((id: number)=>{
    setState(st => st.filter(notif => notif.id !== id));
  }, [])
  return <NotificationContext.Provider value={context}>
    {props.children}
    <div className="notifications">
      {
        state.map(notif => <NotificationWidget key={notif.id} model={notif} destroy={destroy}/>)
      }
    </div>
  </NotificationContext.Provider>
}

function NotificationWidget(props: {model: {id: number, msg: string, type: "success"|"error"}, destroy: (id: number)=>void}) {
  React.useEffect(()=>{
    const handle = setTimeout(()=>{
      props.destroy(props.model.id);
    }, 3000);
    return ()=>{
      clearTimeout(handle);
    }
  }, [props.destroy, props.model.id])
  return <div className={`notification ${props.model.type}`}>
    {props.model.msg}
  </div>
}