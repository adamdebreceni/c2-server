import * as React from 'react';
import { VisibilityIcon } from '../../icons/visibility';
import "./index.scss"

export function PropertyVisibility(props: {active: boolean, onClick: ()=>void}) {
  return <div className={`property-visibility ${props.active ? "active" : ""}`} onClick={props.onClick}>
    <VisibilityIcon size={16}/>
  </div>
}