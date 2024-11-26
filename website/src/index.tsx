import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ServiceContext } from './common/service-context';
import "./index.css";
import { CreateServices } from './services';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AppHeader } from './components/app-header';
import { AgentClasses } from './components/agent-classes';
import { Flows } from './components/flows';
import { FlowView } from './components/flow-view';
import { AgentList } from './components/agent-list';
import { NotificationLayer } from './components/notification';
import { ModalLayer } from './components/modal-layer';
import { AgentDetail } from './components/agent-detail';
import { AgentFlow } from './components/agent-flow';

const services = CreateServices();

function App() {
  return <ServiceContext.Provider value={services}>
    <Router>
      <NotificationLayer>
        <ModalLayer>
          <AppHeader/>
          <div className="content">
            <Routes>
              <Route path="/agent-classes" element={<AgentClasses/>} />
              <Route path="/agents" element={<AgentList/>} />
              <Route path="/agent/:id" element={<AgentDetail/>} />
              <Route path="/agent/:id/flow" element={<AgentFlow/>} />
              <Route path="/flows" element={<Flows/>} />
              <Route path="/flow/:id" element={<FlowView editable={true}/>} />
              <Route path="/flow/edit/:id" element={<FlowView editable={false}/>} />
            </Routes>
          </div>
        </ModalLayer>
      </NotificationLayer>
    </Router>
  </ServiceContext.Provider>
}

createRoot(document.getElementById("root")!).render(<App/>);

// import * as React from 'react';
// import { createRoot } from 'react-dom/client';

// const StateContext = React.createContext<any>(null);

// function Widget(props: any) {
//   const context = React.useContext(StateContext);
//   const view_ref = React.useRef<HTMLDivElement>(null);
//   React.useEffect(()=>{
//     const curr_width = view_ref.current!.getBoundingClientRect().width;
//     if (curr_width !== props.value.width) {
//       context({...props.value, width: curr_width});
//     }
//   }, [context, props.value]);

//   const add_char = React.useCallback(()=>{
//     context({...props.value, text: props.value.text + "a"})
//   }, [props.value, context])

//   return <span ref={view_ref} onClick={add_char}>{props.value.text}</span>
// }

// export function App(props: any) {
//   let [state, setState] = React.useState([{id: "1", text: "One", width: null}]);

//   const setter = React.useCallback((obj: any)=>{
//     console.log("Calling setter");
//     setState(curr => {
//       const new_state = curr.filter(x => x.id !== obj.id);
//       new_state.push(obj);
//       return new_state;
//     })
//   }, [setState])

//   const context = React.useMemo(()=>{
//     return setter;
//   }, [setter])

//   return (
//     <StateContext.Provider value={context}>
//       <div className='App'>
//         {state.map(obj => {
//           return <Widget key={obj.id} value={obj} />
//         })}
//         {state.map(obj => {
//           return <div key={obj.id}>{obj.width}</div>
//         })}
//       </div>
//     </StateContext.Provider>
//   );
// }

// createRoot(document.getElementById("root")!).render(<App/>);