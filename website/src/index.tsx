import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ServiceContext } from './common/service-context';
import "./index.css";
import { CreateServices } from './services';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { AppHeader } from './components/app-header';
import { AgentClasses } from './components/agent-classes';
import { Flows } from './components/flows';
import { FlowView } from './components/flow-view';
import { AgentList } from './components/agent-list';
import { NotificationLayer } from './components/notification';
import { ModalLayer } from './components/modal-layer';
import { AgentDetail } from './components/agent-detail';

const services = CreateServices();

function App() {
  return <ServiceContext.Provider value={services}>
    <Router>
      <NotificationLayer>
        <ModalLayer>
          <AppHeader/>
          <div className="content">
            <Route path="/agent-classes" component={AgentClasses} />
            <Route path="/agents" component={AgentList} />
            <Route path="/agent/:id" component={AgentDetail} />
            <Route path="/flows" component={Flows} />
            <Route path="/flow/:id" component={FlowView} />
          </div>
        </ModalLayer>
      </NotificationLayer>
    </Router>
  </ServiceContext.Provider>
}

ReactDOM.render(<App/>, document.getElementById("root"));