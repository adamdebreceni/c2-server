import * as React from "react";
import { FlowContext } from "../../common/flow-context";

import "./index.scss";

export function ProcessorSelector(props: {processors: {id: string, name: string, description: string}[]}) {
  const flow_context = React.useContext(FlowContext);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const filteredProcessors = props.processors
    .filter(proc => proc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    proc.description.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name < b.name ? -1 : (a.name === b.name ? 0 : 1));

  return <div className="processor-selector">
    <div className="title">Processors</div>
    <input
      type="text"
      placeholder="Search processors..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="search-input"
      ref={searchInputRef}
    />
    <div className="processor-list">
      <div className="processor-list-inner">{
        filteredProcessors.sort((a, b) => a.name < b.name ? -1 : (a.name === b.name ? 0 : 1))
        .map(proc => <ProcessorListItem key={proc.id} id={proc.id} name={proc.name} description={proc.description} />)
      }</div>
    </div>
    <div className="footer">
      <div className="cancel" onClick={()=>flow_context?.closeNewProcessor(null)}>CANCEL</div>
    </div>
  </div>
}

function ProcessorListItem(props: {id: string, name: string, description: string}) {
  const flow_context = React.useContext(FlowContext);
  const [state, setState] = React.useState(false);
  const toggleState = React.useCallback(()=>{
    setState(st => !st);
  }, [])
  return <div className="processor-list-item">
    <div className="header" onClick={toggleState}>
      { state ? <div className="close description-icon">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
        </div> :
        <div className="open description-icon">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
        </div>
      }
      <div className="name">{props.name}</div>
      <div className="fill"/>
      <div className="add" onClick={()=>flow_context?.closeNewProcessor(props.id)}>Add</div>
    </div>
    {
      state ? <div className="description">{props.description}</div> : null
    }
  </div>;
}