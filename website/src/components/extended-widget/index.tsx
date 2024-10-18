import * as React from "react";
import { AiWidget } from "./ai-widget";

export function ExtendedWidget(props: {value: Component}) {
  if (props.value.type.endsWith("AiProcessor")) {
    return <AiWidget value={props.value} />
  }
  return null;
}

export function IsExtended(obj: Component) {
  return (obj.visibleProperties?.length ?? 0) !== 0;
}