import * as React from "react";
import { AiWidget } from "./ai-widget";

import "./index.scss"

export function ExtendedWidget(props: {value: Component}) {
  // if (props.value.type.endsWith("AiProcessor")) {
  //   return <AiWidget value={props.value} />
  // }
  return <div className="extended-widget">
    {
      props.value.visibleProperties!.map(property => {
        return <div key={property} className="extended-property">
          <div className="extended-property-name">{property}</div>
          <div className="extended-property-value">{`${props.value.properties[property]}`}</div>
        </div>
      })
    }
  </div>;
}

export function IsExtended(obj: Component) {
  return (obj.visibleProperties?.length ?? 0) !== 0;
}