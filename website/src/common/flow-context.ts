import * as React from "react";

export const FlowContext = React.createContext<{
  showMenu: (position: {clientX: number, clientY: number}, items: {name: string, on: ()=>void}[])=>void,
  hideMenu: ()=>void,
  moveComponent: (id: Uuid, dx: number, dy: number)=>void,
  deleteComponent: (id: Uuid)=>void,
  editComponent: (id: Uuid)=>void,
  updateProcessor: (id: Uuid, fn: (proc: Processor)=>Processor)=>void,
  updateConnection: (id: Uuid, fn: (conn: Connection)=>Connection)=>void,
  updateService: (id: Uuid, fn: (serv: MiNiFiService)=>MiNiFiService)=>void,
  closeComponentEditor: ()=>void,
  closeNewProcessor: (name: string|null)=>void,
  closeNewService: (name: string|null)=>void,
}|null>(null);