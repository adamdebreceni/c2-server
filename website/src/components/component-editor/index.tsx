import * as React from "react";

import "./index.scss"

export function ComponentEditor(props: {children: React.ReactNode[]|React.ReactNode}) {
  const [resizing, setResizing] = React.useState<boolean>(false);
  const [width, setWidth] = React.useState<number>(() => {
    return parseInt(localStorage.getItem('component-editor-width') ?? '500')
  })
  React.useEffect(() => {
    localStorage.setItem('component-editor-width', width.toString());
  }, [width]);
  const onmousedown = React.useCallback((e: React.MouseEvent) => {
    setResizing(true);
    const mousemove = (e: MouseEvent) => {
      setWidth(curr => curr - e.movementX);
      e.stopImmediatePropagation();
      return false;
    }
    const mouseup = (e: MouseEvent) => {
      setResizing(false);
      document.removeEventListener('mouseup', mouseup);
      document.removeEventListener('mousemove', mousemove);
      e.stopImmediatePropagation();
      return false;
    }
    document.addEventListener('mouseup', mouseup);
    document.addEventListener('mousemove', mousemove);
  }, []);
  return <div className="component-editor" style={{width: `${width}px`}}>
    {props.children}
    <div className="component-editor-resizer" onMouseDown={onmousedown}></div>
  </div>
}
