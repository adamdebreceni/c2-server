import * as React from "react";

export function AddIcon(props: {size: number, className?: string}) {
  return <svg className={props.className ?? ''} xmlns="http://www.w3.org/2000/svg" height={props.size} viewBox="0 0 24 24" width={props.size}>
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"></path>
  </svg>
}