interface Database{
  agents: {
    insert(agent: Agent): Promise<void>
    update(agent: Partial<Agent>, new_values: Partial<Agent>): Promise<void>
    delete(agent: Partial<Agent>): Promise<void>
    select(agent: Partial<Agent>, includeManifest?: boolean): Promise<Agent[]>
  },
  alerts: {
    insert(alert: Alert): Promise<void>
    deleteBefore(agent: AgentId, time: Date): Promise<void>
    selectAfter(agent: AgentId, time: Date): Promise<Alert[]>
  },
  // bulletins: {
  //   insert(bulletin: ProcessorBulletin): Promise<void>
  //   // deleteBefore(time: Date): Promise<void>
  //   selectRange(agent: AgentId, from: Date, to: Date): Promise<ProcessorBulletin[]>
  // },
  classes: {
    insert(clazz: AgentClass): Promise<void>
    update(clazz: Partial<AgentClass>, new_values: Partial<AgentClass>): Promise<void>
    select(clazz: Partial<AgentClass>, includeManifest?: boolean): Promise<AgentClass[]>
  },
  flows: {
    get(id: FlowId): Promise<Buffer|null>
    getSerialized(id: FlowId): Promise<Buffer|null>
    save(flow: Buffer, id?: FlowId): Promise<FlowId>
    serialize(id: FlowId, serializer: (data: Buffer)=>Buffer): Promise<void>
    listAll(): Promise<FlowLike[]>;
  }
}