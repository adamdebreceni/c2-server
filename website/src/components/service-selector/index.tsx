import * as React from "react";
import { FlowContext } from "../../common/flow-context";

import { ComponentSelector } from "../component-selector";

export function ServiceSelector(props: {services: {id: string, name: string, description: string}[]}) {
  const flow_context = React.useContext(FlowContext);
  return <ComponentSelector components={props.services} onClose={flow_context!.closeNewService} type="SERVICE"/>
}