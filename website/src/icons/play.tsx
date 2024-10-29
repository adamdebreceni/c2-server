import * as React from 'react';

export function PlayIcon(props: {size: number}) {
  return <svg className="play-icon" xmlns="http://www.w3.org/2000/svg" height={props.size} viewBox="0 0 24 24" width={props.size} fill="#dddddd">
    <path d="M8 5v14l11-7z"></path>
  </svg>
}