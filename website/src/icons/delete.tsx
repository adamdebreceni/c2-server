import * as React from 'react';

export function DeleteIcon(props: {size: number, onClick: ()=>void}) {
  return <div className="delete-icon" style={{display: "flex", borderRadius: "50%", background: "#ffffff"}} onClick={props.onClick}>
    <svg xmlns="http://www.w3.org/2000/svg" height={props.size} viewBox="0 0 24 24" width={props.size} fill="#dddddd">
      <path d="M0 0h24v24H0z" fill="none"/>
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
    </svg>
  </div>
}