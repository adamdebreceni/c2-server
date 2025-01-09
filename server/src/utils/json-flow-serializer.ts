export function SerializeFlowToJson(id: string, flow: FlowObject): string {
    let result: any = {
        "encodingVersion": {
            "majorVersion": 2,
            "minorVersion": 0
        },
        "maxTimerDrivenThreadCount": 1,
        "registries": [],
        "parameterContexts": (flow.parameterContexts ?? []).map(ctx => {
            return {
                "identifier": ctx.id,
                "name": ctx.name,
                "description": ctx.description,
                "parameters": ctx.parameters.map(param => {
                    return {
                        "name": param.name,
                        "description": param.description,
                        "sensitive": param.sensitive,
                        "value": param.value
                    }
                })
            }
        }),
        "parameterProviders": [],
        "controllerServices": [],
        "reportingTasks": [],
        "templates": []
    };
    result["rootGroup"] = {
        ...serializeProcessGroup(null, flow),
        "identifier": id,
        "variables": {},
        "labels": [],
        "defaultFlowFileExpiration": "0 sec",
        "defaultBackPressureObjectThreshold": 10000,
        "defaultBackPressureDataSizeThreshold": "1 GB",
        "componentType": "PROCESS_GROUP",
        "flowFileConcurrency": "UNBOUNDED",
        "flowFileOutboundPolicy": "STREAM_WHEN_AVAILABLE",
        "controllerServices": flow.services.map(serv => ({
            "position": {"x": serv.position.x, "y": serv.position.y},
            "identifier": serv.id,
            "name": serv.name,
            "type": serv.type,
            "properties": filterNullish(serv.properties),
            "propertyDescriptors": flow.manifest.controllerServices.find(cs_info => cs_info.type === serv.type)?.propertyDescriptors ?? null,
            "bundle": {
                "artifact": flow.manifest.controllerServices.find(cs_info => cs_info.type === serv.type)?.artifact ?? "unknown",
                "group": flow.manifest.controllerServices.find(cs_info => cs_info.type === serv.type)?.group ?? "unknown",
                "version": flow.manifest.controllerServices.find(cs_info => cs_info.type === serv.type)?.version ?? "unknown",
            },
            "componentType": "CONTROLLER_SERVICE",
        }))
    };
    return JSON.stringify(result);
}

function serializeProcessGroup(id: Uuid|null, flow: FlowObject): object {
    const group = flow.processGroups?.find(group => group.id === id);
    const child_groups = flow.processGroups?.filter(group => group.parentGroup === id) ?? [];
    const result = {
        "identifier": id,
        "name": "MiNiFi Flow",
        "position": {"x": flow.view.x, "y": flow.view.y},
        "parameterContextName": flow.parameterContexts?.find(ctx => ctx.id === group?.parameterContext)?.name ?? '',
        "processors": flow.processors.filter(proc => (proc.parentGroup ?? null) === id).map(proc => ({
            "position": {"x": proc.position.x, "y": proc.position.y},
            "identifier": proc.id,
            "instanceIdentifier": proc.id,
            "bulletinLevel": "WARN",
            "executionNode": "ALL",
            "name": proc.name,
            "type": proc.type,
            "concurrentlySchedulableTaskCount": proc.scheduling.concurrentTasks,
            "schedulingStrategy": proc.scheduling.strategy,
            "schedulingPeriod": proc.scheduling.runSchedule,
            "penaltyDuration": proc.penalty,
            "yieldDuration": proc.yield,
            "runDurationMillis": 0,
            "autoTerminatedRelationships":Object.keys(proc.autoterminatedRelationships).filter(rel => proc.autoterminatedRelationships[rel]),
            "properties": filterNullish(proc.properties),
            "componentType": "PROCESSOR",
            "propertyDescriptors": flow.manifest.processors.find(proc_info => proc_info.type === proc.type)?.propertyDescriptors ?? null,
            "bundle": {
                "artifact": flow.manifest.processors.find(proc_info => proc_info.type === proc.type)?.artifact ?? "unknown",
                "group": flow.manifest.processors.find(proc_info => proc_info.type === proc.type)?.group ?? "unknown",
                "version": flow.manifest.processors.find(proc_info => proc_info.type === proc.type)?.version ?? "unknown",
            }
        })),
        "inputPorts": (flow.processGroupsPorts ?? []).filter(port => port.type === 'INPUT' && port.parentGroup === id).map(port => {
            return {
                "identifier": port.id,
                "name": port.name
            }
        }),
        "outputPorts": (flow.processGroupsPorts ?? []).filter(port => port.type === 'OUTPUT' && port.parentGroup === id).map(port => {
            return {
                "identifier": port.id,
                "name": port.name
            }
        }),
        "connections": flow.connections.filter(conn => {
            return flow.processors.find(val => val.parentGroup === id && (val.id === conn.source.id || val.id === conn.destination.id))
                || flow.funnels.find(val => val.parentGroup === id && (val.id === conn.source.id || val.id === conn.destination.id))
                || flow.processGroupsPorts?.find(val => val.type === 'OUTPUT' && val.id === conn.source.id && child_groups.find(child_group => child_group.id === val.parentGroup))
                || flow.processGroupsPorts?.find(val => val.type === 'INPUT' && val.id === conn.destination.id && child_groups.find(child_group => child_group.id === val.parentGroup))
        }).map(conn => {
            const src = findComponent(flow, conn.source.id)!;
            const dst = findComponent(flow, conn.destination.id)!;
            const rels = Object.keys(conn.sourceRelationships).filter(rel => conn.sourceRelationships[rel]);
            return {
                "position": {
                    "x": typeof conn.midPoint === "number" ? conn.midPoint : (conn.midPoint?.x ?? 0.0),
                    "y": (conn.midPoint && typeof conn.midPoint !== "number") ? conn.midPoint.y : 0.0
                },
                "labelIndex": 1,
                "zIndex": 0,
                "identifier": conn.id,
                "instanceIdentifier": conn.id,
                "name": conn.name ?? `${src.name}/${rels.join(",")}/${dst.name}`,
                "source": {
                    "id": src.id,
                    "name": src.name,
                    "type": "PROCESSOR"
                },
                "destination": {
                    "id": dst.id,
                    "name": dst.name,
                    "type": "PROCESSOR"
                },
                "selectedRelationships": rels,
                "backPressureObjectThreshold": conn.backpressureThreshold.count,
                "backPressureDataSizeThreshold": conn.backpressureThreshold.size,
                "flowFileExpiration": conn.flowFileExpiration,
                "componentType": "CONNECTION"
            };
        }),
        "processGroups": child_groups.map(child_group => serializeProcessGroup(child_group.id, flow)),
        "remoteProcessGroups": [],
        "funnels": flow.funnels.filter(val => val.parentGroup === id).map(funnel => {
            return {
                "identifier": funnel.id,
                "name": funnel.name
            }
        }),
    };

    return result;
}

function findComponent(flow: FlowObject, id: Uuid): Component|undefined|null {
    return flow.processors.find(val => val.id === id) ??
        flow.processGroupsPorts?.find(val => val.id === id) ??
        flow.funnels.find(val => val.id === id);
}

function filterNullish(obj: {[key: string]: string|null}): {[key: string]: string} {
    let result: {[key: string]: string} = {};
    for (let key in obj) {
        if (isNullish(obj[key])) continue;
        result[key] = obj[key]!;
    }
    return result;
}

function isNullish(val: string|null) {
    return val === null || val === "<null>";
}