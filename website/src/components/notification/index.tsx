import * as React from "react";
import { useCallback, useState } from "react"
import { NotificationContext } from "../../common/notification-context";

import "./index.scss";
import { SuccessIcon } from "../../icons/success";
import { ErrorIcon } from "../../icons/error";

let id = 1;

export function NotificationLayer(props: {children: React.ReactNode[]|React.ReactNode}) {
  const [state, setState] = useState<{id: number, msg: string, type: "success"|"error"}[]>([]);
  const context = React.useMemo(()=>({
    emit: (msg: string, type: "success"|"error") => {
      setState(st => [...st, {id: id++, msg, type}]);
    }
  }), []);
  const destroy = useCallback((id: number)=>{
    setState(st => st.filter(notif => notif.id !== id));
  }, [])
  // React.useEffect(() => {
  //   setInterval(()=>{
  //     context.emit("Hello from notif", "success");
  //   }, 5000)
  // }, [])

  return <NotificationContext.Provider value={context}>
    {props.children}
    <div className="notifications">
      {
        state.map(notif => <NotificationWidget key={notif.id} model={notif} destroy={destroy}/>)
      }
    </div>
  </NotificationContext.Provider>
}

const NotificationLifetime = 5000;

function NotificationWidget(props: {model: {id: number, msg: string, type: "success"|"error"}, destroy: (id: number)=>void}) {
  const timeout_ref = React.useRef<HTMLDivElement>(null);
  const [state, setState] = useState(true);

  React.useEffect(()=>{
    if (!state) {
      timeout_ref.current!.style.width = "100%";
      return;
    }
    let mounted = true;
    let start_time = performance.now();
    const update_timeout = () => {
      if (!mounted) {
        return;
      }
      const curr_time = performance.now();
      if (curr_time - start_time > NotificationLifetime) {
        props.destroy(props.model.id);
      } else {
        timeout_ref.current!.style.width = `${100 - Math.floor(100 * (curr_time - start_time) / NotificationLifetime)}%`;
        requestAnimationFrame(update_timeout);
      }
    }
    requestAnimationFrame(update_timeout);
    return ()=>{
      mounted = false;
    }
  }, [props.destroy, props.model.id, state])

  return <div className={`notification ${props.model.type}`} onMouseLeave={()=>setState(true)} onMouseEnter={()=>setState(false)}>
    {props.model.type === "success" ?
      <SuccessIcon size={24} /> :
      <ErrorIcon size={24} />  
    }
    {props.model.msg}
    <div className="close" onClick={()=>props.destroy(props.model.id)}>
      <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24" width="18">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </div>
    <div ref={timeout_ref} className="timeout"></div>
  </div>
}