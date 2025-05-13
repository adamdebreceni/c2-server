import * as React from 'react';

export function WarningIcon(props: {size: number}) {
  return <div style={{display: "flex", borderRadius: "50%"}}>
    <svg xmlns="http://www.w3.org/2000/svg" height={props.size} viewBox="0 0 24 24" width={props.size} style={{fill: 'var(--highlight-red)'}}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2zm0-4h-2V7h2z"/>
    </svg>
  </div>
}