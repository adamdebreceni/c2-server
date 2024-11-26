
import * as React from 'react';

export function PauseIcon(props: {size: number}) {
  return <svg className="pause-icon" xmlns="http://www.w3.org/2000/svg" height={props.size} viewBox="0 0 24 24" width={props.size} fill="#dddddd">
    <path d="M6 19h4V5H6zm8-14v14h4V5z"></path>
  </svg>
}