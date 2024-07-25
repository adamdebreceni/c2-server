import * as React from 'react';

import "./index.scss";

export function Tooltip(props: {children: React.ReactNode, message: React.ReactNode}) {
  return <div className="tooltip-container">
    {props.children}
    <div className="tooltip-message">{props.message}</div>
  </div>
}