import * as React from "react";
import "./index.scss"
import { SparkleIcon } from "../../../icons/sparkle";

export function AiWidget(props: {value: Component}) {
  return <div className="ai-widget">
    <div className="header">
      <SparkleIcon size={20} />
    </div>
    <div className="prompt">{props.value.properties["Prompt"]}</div>
  </div>
}