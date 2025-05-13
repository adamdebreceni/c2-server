
import * as React from 'react';

export function EditTextIcon(props: {size: number, onClick: ()=>void}) {
  return <div className="edit-text-icon" style={{display: "flex", borderRadius: "50%", background: "var(--bg-color)"}} onClick={props.onClick}>
    <svg xmlns="http://www.w3.org/2000/svg" height={props.size} viewBox="0 0 24 24" width={props.size} fill="#dddddd">
      <path d="M3 18h12v-2H3zM3 6v2h18V6zm0 7h18v-2H3z"></path>
    </svg>
  </div>
}