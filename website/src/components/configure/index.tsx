import * as React from "react";
import { useState } from "react"
import {InputField} from "../component-editor-input";
import { Toggle } from "../component-editor-toggle";
import "./index.scss"

let nextPropId = 1;

type Property = {id: number, name: string, value: string, persist: boolean};
type Properties = Property[]

export function ConfigureModal(props: {onSubmit: (properties: Properties)=>Promise<void>}) {
  const [properties, setProperties] = useState<Properties>([]);
  const stateRef = React.useRef<Properties>();
  stateRef.current = properties;
  const onConfigure = React.useCallback(()=>{
    props.onSubmit(stateRef.current!);
  }, [props.onSubmit]);
  const onPropChange = React.useCallback((new_prop: Property)=>{
    setProperties(props => {
      const idx = props.findIndex(prop => prop.id === new_prop.id);
      if (idx === -1) return props;
      const new_props = props.slice();
      new_props[idx] = new_prop;
      return new_props;
    })
  }, [])
  const addProperty = React.useCallback(()=>{
    setProperties(props => [...props, {id: nextPropId++, name: "", value: "", persist: false}])
  }, [])
  return <div className="configure-modal">
    <div className="title">Configure Agent</div>
    <div className="property-list-container">
      <div className="property-list">{
        properties.map(prop => <PropertyWidget key={prop.id} model={prop} onRemove={()=>{}} onChange={onPropChange}/>)
      }
      </div>
      <div className="add-property" onClick={addProperty}>
        <svg xmlns="http://www.w3.org/2000/svg" height="36px" viewBox="0 0 24 24" width="36px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      </div>
    </div>
    <div className="footer">
      <div className="submit" onClick={onConfigure}>Configure</div>
    </div>
  </div>
}

function PropertyWidget(props: {model: Property, onRemove: (name: string)=>void, onChange: (val: Property)=>void}) {
  return <div className="property">
    <InputField name="Name" width="100%" default={props.model.name} labelPaddingBottom={0} onChange={val=>props.onChange({...props.model, name: val})}/>
    <InputField name="Value" width="100%" default={props.model.value} labelPaddingBottom={0} onChange={val=>props.onChange({...props.model, value: val})}/>
    <Toggle name="Persist" marginBottom="10px" onChange={val => props.onChange({...props.model, persist: val})}/>
  </div>
}