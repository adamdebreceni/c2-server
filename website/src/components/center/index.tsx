import * as React from "react";
import "./index.scss"

export function Center(props: {children: React.ReactChild[]|React.ReactChild}) {
  return <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100%", width: "100%"}}>{props.children}</div>
}