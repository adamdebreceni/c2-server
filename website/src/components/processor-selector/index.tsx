import * as React from "react";
import { FlowContext } from "../../common/flow-context";

import { ComponentSelector } from "../component-selector";

export function ProcessorSelector(props: {processors: {id: string, name: string, description: string}[]}) {
  const flow_context = React.useContext(FlowContext);
  return <ComponentSelector components={props.processors} onClose={flow_context!.closeNewProcessor} type="PROCESSOR"/>
}