import * as React from 'react';

export function ArrowLeftIcon(props: {size: number}) {
  return <svg className="arrow-left-icon" xmlns="http://www.w3.org/2000/svg" height={props.size} viewBox="0 0 24 24" width={props.size} fill="var(--text-color)">
    <path d="M17.77 3.77 16 2 6 12l10 10 1.77-1.77L9.54 12z"></path>
  </svg>
}