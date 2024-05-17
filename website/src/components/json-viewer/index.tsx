import * as React from "react";
import "./index.scss"

export function JsonView(props: {value: JsonValue}) {
  const [collapsed, setCollapsed] = React.useState<boolean>(true); 
  const toggleCollapsed = React.useCallback(()=>{
    setCollapsed(curr => !curr);
  }, []);
  if (typeof props.value === "string") {
    return <div className="json-string">"{props.value}"</div>
  }
  if (typeof props.value === "number") {
    return <div className="json-number">{props.value}</div>
  }
  if (props.value === undefined) {
    return <div className="json-undefined">undefined</div>
  }
  if (props.value === null) {
    return <div className="json-null">null</div>
  }
  if (typeof props.value === "boolean") {
    return <div className="json-boolean">{`${props.value}`}</div>
  }
  if (collapsed) {
    if (props.value instanceof Array) {
      return <div className="json-array" onClick={toggleCollapsed}>[length:{props.value.length}]</div>
    }
    if ("type" in props.value && typeof (props.value as any).type === "string") {
      return <div className="json-object" onClick={toggleCollapsed}>[type:{(props.value as any).type}]</div>
    }
    if ("name" in props.value && typeof (props.value as any).name === "string") {
      return <div className="json-object" onClick={toggleCollapsed}>[name:{(props.value as any).name}]</div>
    }
    return <div className="json-object" onClick={toggleCollapsed}>[Object]</div>
  }

  return <>
    <div className="json-object-open" onClick={toggleCollapsed}>{"{"}</div><br/>
    <div className="json-object-properties">
      {Object.keys(props.value).map(key => {
        return <React.Fragment key={key}>
          <div className="json-property-name">{key}: </div>
          <div className="json-property-value"><JsonView value={(props.value as any)[key]}/>,</div><br/>
        </React.Fragment>
      })}
    </div>
    <div className="json-object-close">{"}"}</div>
  </>
}