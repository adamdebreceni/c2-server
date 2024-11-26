import * as React from "react";

export const FlowContext = React.createContext<{
  showMenu: (position: {clientX: number, clientY: number}, items: {name: string, on: ()=>void}[])=>void,
  hideMenu: ()=>void,
  setMovingComponent: (id: Uuid, moving: boolean)=>void,
  moveConnection: (id: Uuid, dx: number, dy: number)=>void,
  deleteComponent: (id: Uuid)=>void,
  editComponent: (id: Uuid)=>void,
  updateProcessor: (id: Uuid, fn: (proc: Processor)=>Processor)=>void,
  updateConnection: (id: Uuid, fn: (conn: Connection)=>Connection)=>void,
  updateService: (id: Uuid, fn: (serv: MiNiFiService)=>MiNiFiService)=>void,
  updateGroup: (id: Uuid, fn: (group: ProcessGroup)=>ProcessGroup)=>void,
  updateFunnel: (id: Uuid, fn: (funnel: Funnel)=>Funnel)=>void,
  updateParameterContext: (id: Uuid, fn: (ctx: ParameterContext)=>ParameterContext)=>void,
  updatePort: (id: Uuid, fn: (port: ProcessGroupPort)=>ProcessGroupPort)=>void,
  closeComponentEditor: ()=>void,
  closeNewProcessor: (name: string|null)=>void,
  closeNewService: (name: string|null)=>void,
  editable: boolean
  agentId?: string
  startProcessor?: (id: Uuid)=>void
  stopProcessor?: (id: Uuid)=>void
  clearProcessorState?: (id: Uuid)=>void
  updateRun?: (proc_id: Uuid, run_id: Uuid, fn: (run: ProcessorRun)=>ProcessorRun|ProcessorRun[]|undefined)=>void
}|null>(null);