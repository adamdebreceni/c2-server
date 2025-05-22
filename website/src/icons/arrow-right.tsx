import * as React from 'react';

export function ArrowRightIcon(props: {size: number}) {
  return <svg className="arrow-right-icon" xmlns="http://www.w3.org/2000/svg" height={props.size} viewBox="0 0 24 24" width={props.size} fill="var(--text-color)">
    <path d="M6.23 20.23 8 22l10-10L8 2 6.23 3.77 14.46 12z"></path>
  </svg>
}