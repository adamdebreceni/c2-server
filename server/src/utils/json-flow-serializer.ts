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

function serializeProcessGroup(id: Uuid | null, flow: FlowObject): object {
    const group = flow.processGroups?.find(group => group.id === id);
    const child_groups = flow.processGroups?.filter(group => group.parentGroup === id) ?? [];
    const result = {
        "identifier": id,
        "name": group?.name ?? "MiNiFi Flow",
        "position": group ? {"x": group.position.x, "y": group.position.y} : {"x": flow.view.x, "y": flow.view.y},
        "size": group?.size ? {"width": group.size.width, "height": group.size.height} : null,
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
            "autoTerminatedRelationships": Object.keys(proc.autoterminatedRelationships).filter(rel => proc.autoterminatedRelationships[rel]),
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
                "name": funnel.name,
                "position": {
                    "x": funnel.position.x,
                    "y": funnel.position.y
                },
            }
        }),
    };

    return result;
}

function findComponent(flow: FlowObject, id: Uuid): Component | undefined | null {
    return flow.processors.find(val => val.id === id) ??
        flow.processGroupsPorts?.find(val => val.id === id) ??
        flow.funnels.find(val => val.id === id);
}

function filterNullish(obj: { [key: string]: string | null }): { [key: string]: string } {
    let result: { [key: string]: string } = {};
    for (let key in obj) {
        if (isNullish(obj[key])) continue;
        result[key] = obj[key]!;
    }
    return result;
}

function isNullish(val: string | null) {
    return val === null || val === "<null>";
}

export function DeserializeJsonToFlow(json_str: string, manifest: AgentManifest): FlowObject|null {
    try {
        const flow_json = JSON.parse(json_str);

        let flow_object: FlowObject = {
            manifest: manifest,
            view: {
                x: flow_json.rootGroup.position?.x ?? 0,
                y: flow_json.rootGroup.position?.y ?? 0,
                zoom: 1
            },
            processors: [],
            remoteProcessGroups: [],
            connections: [],
            services: [],
            parameters: [],
            funnels: [],
            state: undefined,
            runs: undefined,
            processGroups: [],
            processGroupsPorts: [],
            parameterContexts: [],
        };

        flow_object.parameterContexts = flow_json.parameterContexts.map((ctx: any) => ({
            id: ctx.identifier,
            name: ctx.name,
            description: ctx.description,
            type: "ParameterContext",
            position: {
                x: ctx.position?.x ?? 0,
                y: ctx.position?.y ?? 0
            },
            parameters: ctx.parameters.map((param: any) => ({
                name: param.name,
                description: param.description,
                sensitive: param.sensitive,
                value: param.value
            }))
        }));

        deserializeProcessGroup(flow_object, null, null, flow_json.rootGroup);
        fixFlowObject(flow_object);
        return flow_object;
    } catch (error) {
        console.error(error);
    }
    return null;
}

function deserializeProcessGroup(flow_object: FlowObject, group_id: Uuid | null, parent_id: Uuid | null, process_group_json: any) {
    if (flow_object.processGroups && group_id !== null) {
        flow_object.processGroups.push({
            position: {
                x: process_group_json.position?.x ?? 0,
                y: process_group_json.position?.y ?? 0,
            },
            size: {
                width: process_group_json.size?.width ?? 100,
                height: process_group_json.size?.height ?? 100,
            },
            id: group_id,
            name: process_group_json.name,
            parentGroup: parent_id,
            parameterContext: null
        });
    }
    try {
        if (process_group_json.inputPorts) {
            flow_object.processGroupsPorts = flow_object.processGroupsPorts?.concat(process_group_json.inputPorts.map((input_port: any) => ({
                position: {x: 0, y: 0},
                parentGroup: group_id,
                type: 'INPUT',
                side: null,
                id: input_port.identifier,
                name: input_port.name,
                properties: {},
            })))
        }
        if (process_group_json.outputPorts) {
            flow_object.processGroupsPorts = flow_object.processGroupsPorts?.concat(process_group_json.outputPorts.map((input_port: any) => ({
                position: {x: 0, y: 0},
                parentGroup: group_id,
                type: 'OUTPUT',
                side: null,
                id: input_port.identifier,
                name: input_port.name,
                properties: {},
            })))
        }
        if (process_group_json.connections) {
            flow_object.connections = flow_object.connections.concat(process_group_json.connections.map((conn: any) => ({
                id: conn.identifier,
                name: conn.name,
                errors: [],
                attributes: [],
                source: {
                    id: conn.source.id,
                    port: null
                },
                sourceRelationships: conn.selectedRelationships.reduce(
                    (acc: { [name: string]: boolean }, rel: string) => {
                        acc[rel] = true;
                        return acc;
                    },
                    {}),
                destination: {
                    id: conn.destination.id,
                    port: null
                },
                flowFileExpiration: conn.flowFileExpiration,
                swapThreshold: null,
                backpressureThreshold: {
                    count: conn.backPressureObjectThreshold,
                    size: conn.backPressureDataSizeThreshold
                },
                parentGroup: group_id,
            })));
        }
        if (process_group_json.controllerServices) {
            flow_object.services = flow_object.services.concat(process_group_json.controllerServices.map((serv: any) => ({
                id: serv.identifier,
                name: serv.name,
                type: serv.type,
                position: {
                    x: serv.position?.x ?? 0,
                    y: serv.position?.y ?? 0,
                },
                properties: serv.properties,
                parentGroup: group_id,
            })));
        }

        if (process_group_json.processors) {
            flow_object.processors = flow_object.processors.concat(process_group_json.processors.map((proc: any) => ({
                position: {
                    x: proc.position?.x ?? 0,
                    y: proc.position?.y ?? 0,
                },
                id: proc.identifier,
                type: proc.type,
                name: proc.name,
                properties: proc.properties,
                parentGroup: group_id,
                penalty: proc.penaltyDuration,
                yield: proc.yieldDuration,
                autoterminatedRelationships: proc.autoTerminatedRelationships.reduce(
                    (acc: { [name: string]: boolean }, rel: string) => {
                        acc[rel] = true;
                        return acc;
                    },
                    {}),
                scheduling: {
                    strategy: proc.schedulingStrategy,
                    concurrentTasks: proc.concurrentlySchedulableTaskCount,
                    runSchedule: proc.schedulingPeriod,
                    runDuration: 0
                },
            })));
        }
        if (process_group_json.funnels) {
            flow_object.funnels = flow_object.funnels.concat(process_group_json.funnels.map((funnel: any) => ({
                position: {
                    x: funnel.position?.x ?? 0,
                    y: funnel.position?.y ?? 0,
                },
                id: funnel.identifier,
                type: "Funnel",
                name: funnel.name,
                properties: {},
                parentGroup: group_id,
            })));
        }
        for (let child_process_group of process_group_json.processGroups) {
            deserializeProcessGroup(flow_object, child_process_group.identifier, group_id, child_process_group);
        }
    } catch (e) {
        console.error("Could not deserializeProcessGroup", e);
    }
}

function fixFlowObject(flow_object: FlowObject) {
    for (let processor of flow_object.processors) {
        const processor_manifest = flow_object.manifest.processors.find(processor_manifest => processor_manifest.type === processor.type);
        if (processor_manifest && processor_manifest.propertyDescriptors) {
            for (let property_name in processor_manifest.propertyDescriptors) {
                if (!(property_name in processor.properties)) {
                    processor.properties[property_name] = null;
                }
            }
        }
        if (processor_manifest && processor_manifest.supportedRelationships) {
            for (let relationship of processor_manifest.supportedRelationships) {
                if (!(relationship.name in processor.autoterminatedRelationships)) {
                    processor.autoterminatedRelationships[relationship.name] = false;
                }
            }
        }
    }
    for (let service of flow_object.services) {
        const service_manifest = flow_object.manifest.controllerServices.find(controller_manifest => controller_manifest.type === service.type);
        if (service_manifest && service_manifest.propertyDescriptors) {
            for (let property_name in service_manifest.propertyDescriptors) {
                if (!(property_name in service.properties)) {
                    service.properties[property_name] = null;
                }
            }
        }
    }
    for (let connection of flow_object.connections) {
        const source_processor = flow_object.processors.find(processor => processor.id === connection.source.id);
        if (source_processor) {
            const source_manifest = flow_object.manifest.processors.find(processor_manifest => processor_manifest.type === source_processor.type);
            if (source_manifest) {
                for (let relationship of source_manifest.supportedRelationships) {
                    if (!(relationship.name in connection.sourceRelationships)) {
                        connection.sourceRelationships[relationship.name] = false;
                    }
                }
            }
        }
    }
}
