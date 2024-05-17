import * as React from "react";

import "./index.scss";

export function Surface(props: {x: number, y: number, zoom: number, children?: React.ReactNode | React.ReactNode[]}) {
  return <div className="outer-surface surface-fragment noselect" style={{
    transform: `translate(${- (props.x - Math.floor(props.x)) * props.zoom}px, ${- (props.y - Math.floor(props.y)) * props.zoom}px)`
  }}>
    <div className="middle-surface surface-fragment" style={{
      transform: `scale(${props.zoom})` 
    }}>
      <div className="inner-surface surface-fragment" style={{
        transform: `translate(${-Math.floor(props.x)}px, ${-Math.floor(props.y)}px)`
      }}>{props.children}</div>
    </div>
  </div>
}