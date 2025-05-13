import * as React from "react";

export function CloseIcon(props: {size: number, className?: string, onClick?: ()=>void}) {
  return <div className="close" onClick={props.onClick}>
    <svg className={props.className ?? ''} xmlns="http://www.w3.org/2000/svg" height={props.size} viewBox="0 0 24 24" width={props.size}>
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  </div>
}