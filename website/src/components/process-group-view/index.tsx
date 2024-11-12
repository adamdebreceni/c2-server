import * as React from 'react';

import './index.scss';
import { FlowContext } from '../../common/flow-context';
import { ResizeDir } from '../flow-editor';
import { ConfirmModal } from '../confirm-modal';
import { ModalContext } from '../../common/modal-context';

const borderWidth = 1;

export function ProcessGroupView(props: {model: ProcessGroup, resize?: ResizeDir, container?: Positionable|null}) {
  const flow_context = React.useContext(FlowContext);
  const openModal = React.useContext(ModalContext);
  const onmousedown = React.useCallback((e: React.MouseEvent)=>{
    if (e.button !== 0) return;
    flow_context?.setMovingComponent(props.model.id, true);
    e.stopPropagation();
  }, [props.model.id, flow_context?.setMovingComponent]);
  const oncontextmenu = React.useCallback((e: React.MouseEvent)=>{
    e.preventDefault();
    const {clientX, clientY} = e;
    flow_context?.showMenu({clientX, clientY}, [{name: "Edit", on: ()=>{
      flow_context.editComponent(props.model.id);
      flow_context.hideMenu();
    }},{name: "Delete", on: ()=>{
      openModal(<ConfirmModal confirmLabel="Delete" text={`Warning, you are about to delete all resources owned by this process group. Are you sure?`} onConfirm={()=>{
        flow_context.deleteComponent(props.model.id);
      }}/>)
      flow_context.hideMenu();
    }}])
  }, [props.model.id, flow_context?.showMenu, flow_context?.deleteComponent])

  const ondblclick = React.useCallback(()=>{
    flow_context?.editComponent(props.model.id);
  }, [props.model.id, flow_context?.editComponent]);
  
  return <div className={`widget-container ${props.container ? 'active' : ''}`} style={{left: `${props.container?.position.x ?? 0}px`, top: `${props.container?.position.y ?? 0}px`, width: `${props.container?.size?.width ?? 0}px`, height: `${props.container?.size?.height ?? 0}px`}}>
    <div className={`process-group ${props.resize}`} style={{left: `${props.model.position.x - borderWidth - (props.container?.position.x ?? 0)}px`, top: `${props.model.position.y - borderWidth - (props.container?.position.y ?? 0)}px`, width: `${(props.model.size?.width ?? 0) + 2 * borderWidth}px`, height: `${(props.model.size?.height ?? 0) + 2 * borderWidth}px`}}>
    <div className='process-group-header' onMouseDown={onmousedown} onDoubleClick={ondblclick} onContextMenu={oncontextmenu}>{props.model.name}</div>
  </div>
  </div>;
}