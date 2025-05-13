import * as React from "react";
import { FlowContext } from "../../common/flow-context";

import "./index.scss";
import { CloseIcon } from "../../../src/icons/close";
import { Fill } from "../fill/Fill";
import { AddIcon } from "../../../src/icons/add";

type ComponentDescription = {id: string, name: string, description: string};

type SelectorState = {
  query: string,
  components: ComponentDescription[],
  position: number|null
}

export function ComponentSelector(props: {components: ComponentDescription[], onClose: (value: string|null)=>void, type: "PROCESSOR"|"SERVICE"}) {
  const [state, setState] = React.useState<SelectorState>({query: '', components: props.components, position: 0});

  const stateRef = React.useRef<SelectorState>(null);
  stateRef.current = state;
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const list_ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  React.useLayoutEffect(()=>{
    if (!list_ref.current) return;

    const item_view = state.position ? list_ref.current.getElementsByClassName("component-list-item")[state.position] : null;
    if (!item_view) return;

    const begin = item_view.getBoundingClientRect().top - item_view.parentElement!.getBoundingClientRect().top;
    const end = begin + item_view.getBoundingClientRect().height;

    if (begin < list_ref.current.scrollTop) {
      list_ref.current.scrollTop = begin;
      return;
    }
    if (end > list_ref.current.scrollTop + list_ref.current.getBoundingClientRect().height) {
      if (item_view.getBoundingClientRect().height < list_ref.current.getBoundingClientRect().height) {
        list_ref.current.scrollTop = end - list_ref.current.getBoundingClientRect().height;
      } else {
        list_ref.current.scrollTop = begin;
      }
    }
  }, [state])

  const handleKey = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.code === "Escape") {
      props.onClose(null);
    }
    if (e.code === "ArrowDown") {
      setState(st => {
        return {...st, position: ((st.position ?? 0) + 1) % st.components.length}
      })
    }
    if (e.code === "ArrowUp") {
      setState(st => {
        return {...st, position: ((st.position ?? 0) - 1 + st.components.length) % st.components.length}
      })
    }
    if (e.code === "Enter") {
      const comp = stateRef.current?.components?.[stateRef.current?.position ?? 0];
      if (comp) {
        props.onClose(comp.id)
      }
    }
  }, [props.onClose]);

  const handleInput = React.useCallback((e: React.FormEvent<HTMLInputElement>) => {
    setState(st => {
      const new_query =  (e.target as any).value;
      if (st.query === new_query) {
        return st;
      }
      const filteredComponents = props.components
        .filter(proc => proc.name.toLowerCase().includes(new_query.toLowerCase()) || proc.description.toLowerCase().includes(new_query.toLowerCase()))
        .sort((a, b) => a.name < b.name ? -1 : (a.name === b.name ? 0 : 1));

      return {query: new_query, components: filteredComponents, position: 0};
    });
  }, [props.components]);

  return <div className="component-selector popout">
    <div className="title">
      {props.type === "PROCESSOR" ? "Processors" : "Services"}
      <Fill />
      <CloseIcon size={18} onClick={()=>props.onClose(null)} />
    </div>
    <input
      type="text"
      placeholder={`Search ${props.type === "PROCESSOR" ? "processors" : "services"}...`}
      value={state.query}
      onInput={handleInput}
      onKeyDown={handleKey}
      onBlur={()=>{
        setState(st => {
          return {...st, position: null}
        })
      }}
      onFocus={()=>{
        setState(st => {
          return {...st, position: 0}
        })
      }}
      className="search-input"
      ref={searchInputRef}
    />
    <div ref={list_ref} className="component-list">
      <div className="component-list-inner">{
        state.components.map((proc, idx) => <ComponentListItem key={proc.id} id={proc.id} active={state.position === idx} name={proc.name} description={proc.description} onAdd={props.onClose}/>)
      }</div>
    </div>
  </div>
}

function ComponentListItem(props: {id: string, name: string, description: string, active: boolean, onAdd: (value: string|null)=>void}) {
  const flow_context = React.useContext(FlowContext);
  const [state, setState] = React.useState(false);
  const toggleState = React.useCallback(()=>{
    setState(st => !st);
  }, [])
  return <div className={`component-list-item ${props.active ? "active" : ""}`}>
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
      <div className="add" onClick={()=>props.onAdd(props.id)}>
        <AddIcon size={14} />
        Add
      </div>
    </div>
    {
      state ? <div className="description">{props.description}</div> : null
    }
  </div>;
}