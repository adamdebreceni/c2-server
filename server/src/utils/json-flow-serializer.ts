export function SerializeFlowToJson(id: string, flow: FlowObject): string {
    let result: any = {
        "encodingVersion": {
            "majorVersion": 2,
            "minorVersion": 0
        },
        "maxTimerDrivenThreadCount": 1,
        "registries": [],
        "parameterContexts": [],
        "parameterProviders": [],
        "controllerServices": [],
        "reportingTasks": [],
        "templates": []
    };
    result["rootGroup"] = {
        "identifier": id,
        "name": "MiNiFi Flow",
        "position": {"x": flow.view.x, "y": flow.view.y},
        "processors": flow.processors.map(proc => ({
            "position": {"x": proc.position.x, "y": proc.position.y},
            "identifier": proc.id,
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
        "inputPorts": [],
        "outputPorts": [],
        "connections": flow.connections.map(conn => {
            const src = flow.processors.find(proc => conn.source.id === proc.id)!;
            const dst = flow.processors.find(proc => conn.destination.id === proc.id)!;
            const rels = Object.keys(conn.sourceRelationships).filter(rel => conn.sourceRelationships[rel]);
            return {
                "position": {
                    "x": typeof conn.midPoint === "number" ? conn.midPoint : (conn.midPoint?.x ?? 0.0),
                    "y": (conn.midPoint && typeof conn.midPoint !== "number") ? conn.midPoint.y : 0.0
                },
                "labelIndex": 1,
                "zIndex": 0,
                "identifier": conn.id,
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
        "processGroups": [],
        "remoteProcessGroups": [],
        "labels": [],
        "funnels": [],
        "variables": {},
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