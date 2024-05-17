import * as React from "react";

export const FlowContext = React.createContext<{
  showMenu: (position: {clientX: number, clientY: number}, items: {name: string, on: ()=>void}[])=>void,
  hideMenu: ()=>void,
  moveComponent: (id: Uuid, dx: number, dy: number)=>void,
  deleteComponent: (id: Uuid)=>void,
  editComponent: (id: Uuid)=>void,
  updateProcessor: (proc: Processor)=>void,
  updateConnection: (conn: Connection)=>void,
  updateService: (serv: MiNiFiService)=>void,
  closeComponentEditor: ()=>void,
  closeNewProcessor: (name: string|null)=>void,
  closeNewService: (name: string|null)=>void,
}|null>(null);