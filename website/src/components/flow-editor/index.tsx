import {useState} from "react"
import * as React from "react";
import {Surface} from "../surface";
import {Widget} from "../widget";
import * as uuid from 'uuid';

import "./index.scss"
import {ConnectionView} from "../connection";
import {FlowContext} from "../../common/flow-context";
import {Menu} from "../menu";
import {ProcessorEditor} from "../processor-editor";
import {ConnectionEditor} from "../connection-editor";
import {ProcessorSelector} from "../processor-selector";
import {ServiceContext} from "../../common/service-context";
import {PublishModal} from "../publish-modal";
import {useNavigate} from "react-router";
import {NotificationContext} from "../../common/notification-context";
import {Eval} from "../../utils/attribute-expression";
import {ServiceSelector} from "../service-selector";
import {ServiceEditor} from "../service-editor";
import {ProcessGroupEditor} from "../process-group-editor";
import {FunnelEditor} from "../funnel-editor";
import {ProcessGroupPortEditor} from "../port-editor";
import {ParameterContextEditor} from "../parameter-context-editor";
import {ProcessGroupView} from "../process-group-view";
import {width, height} from "../../utils/widget-size";

import {autoLayout, createGraph} from "../../utils/auto-layout"
import { ComponentEditor } from "../component-editor";
import { AssetManager } from "../asset-manager";

interface NewConnection {
    source: Uuid,
    to: { x: number, y: number } | Uuid | null,
    midPoint: { x: number, y: number } | number | null
}

export type PositionableGroup = Positionable & { id: Uuid, parentGroup: Uuid | null }

export type ResizeDir = 'top' | 'top-left' | 'left' | 'bottom-left' | 'bottom' | 'bottom-right' | 'right' | 'top-right';

interface FlowEditorState {
    saved: boolean,
    flow: FlowObject
    menu: { position: { x: number, y: number }, items: { name: string, on: () => void }[] } | null
    panning: boolean,
    editingComponent: Uuid | null,
    newConnection: NewConnection | null,
    selected: Uuid[],
    newProcessGroup: { from: { x: number, y: number } | null, to: { x: number, y: number } | null } | null,
    newComponent: {
        x: number,
        y: number,
        type: "PROCESSOR" | "SERVICE",
        srcProcessor?: Uuid,
        parentGroup: Uuid | null
    } | null,
    resizeGroup: { id: Uuid, direction: ResizeDir, active: boolean } | null,
    movingComponent: {
        id: Uuid,
        start: { x: number, y: number } | null,
        original: { x: number, y: number } | null
    } | null,
    // newProcessGroup:
    publish: PublishState
}

function createDefaultConnection(flow: FlowObject, src: Uuid, dst: Uuid, midPoint?: {
    x: number,
    y: number
} | number | null): Connection {
    const proc = flow.processors.find(proc => proc.id === src)!;
    const rels: { [name: string]: boolean } = {};
    if (proc) {
        for (const rel in proc.autoterminatedRelationships) {
            rels[rel] = false;
        }
        const manifest = flow.manifest.processors.find(proc_manifest => proc_manifest.type === proc.type);
        if (manifest?.supportsDynamicRelationships) {
            for (const prop in proc.properties) {
                if (!manifest.propertyDescriptors || !(prop in manifest.propertyDescriptors)) {
                    rels[prop] = false;
                }
            }
        }
    } else {
        rels['success'] = true;
    }
    return {
        id: uuid.v4() as Uuid,
        name: null,
        source: {id: src, port: null},
        sourceRelationships: rels,
        destination: {id: dst, port: null},
        flowFileExpiration: "0 seconds",
        backpressureThreshold: {count: "10000", size: "10 MB"},
        swapThreshold: null,
        errors: [],
        attributes: [],
        midPoint: midPoint ?? undefined
    }
}

const padding = 5;

const handleExport = async (flow_id: string, services: Services | null) => {
    if (services === null) {
        console.error("No services found for download");
    } else {
        let url: string | null = null;
        let link: HTMLAnchorElement | null = null;

        try {
            let flow_str = JSON.stringify(await services.flows.getSerialized(flow_id));
            const blob = new Blob([flow_str], {type: "application/json"});
            url = URL.createObjectURL(blob);

            link = document.createElement("a");
            link.href = url;
            link.download = `${flow_id}.json`;

            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            if (link && link.parentNode) {
                document.body.removeChild(link);
            }

            if (url) {
                URL.revokeObjectURL(url);
            }
        }
    }
};

async function calculateNewLayout(state: FlowEditorState) {
    console.log("rearrange");

    let new_flow = state.flow;

    const graph = createGraph(new_flow);
    await autoLayout(new_flow, graph, null);

    console.log(new_flow.processors);
    console.log(new_flow.processGroups);
    return new_flow;
}

export function FlowEditor(props: { id: string, flow: FlowObject }) {
    const [state, setState] = useState<FlowEditorState>({
        saved: true, publish: {agents: [], classes: [], targetFlow: null, modal: false, pending: false},
        flow: props.flow, panning: false, menu: null, editingComponent: null, newConnection: null, newComponent: null,
        resizeGroup: null, movingComponent: null, newProcessGroup: null, selected: []
    });
    const [errors, setErrors] = useState<ErrorObject[]>([]);
    const areaRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setState((st) => ({
                    ...st,
                    newConnection: null,
                    newComponent: null,
                    editingComponent: null,
                    menu: null,
                    newProcessGroup: null
                }));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
    const mousedown = React.useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const {clientX, clientY} = e;
        setState(st => {
            if (st.newComponent || st.editingComponent || st.publish.modal || st.movingComponent || st.newConnection || st.newProcessGroup) return st;
            if (st.resizeGroup) {
                return {...st, resizeGroup: {...st.resizeGroup, active: true}};
            }
            // if (st.newConnection) {
            //   const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
            //   return {...st, newConnection: {...st.newConnection, to: {x, y}}};
            // }
            return {...st, panning: true}
        });
    }, [])

    const mouseclick = React.useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const {clientX, clientY} = e;
        setState(st => {
            if (st.newComponent || st.editingComponent || st.publish.modal || st.movingComponent || st.resizeGroup) return st;
            if (st.newProcessGroup) {
                const {x, y} = toAreaCoords(areaRef, st, e);
                if (!st.newProcessGroup.from) {
                    return {...st, newProcessGroup: {...st.newProcessGroup, from: {x, y}, to: {x, y}}};
                }
                // return st;
                const id = uuid.v4() as Uuid;
                return {
                    ...st, newProcessGroup: null, flow: {
                        ...st.flow,
                        processGroups: topSortGroups([...setComponentGroupParents(st.flow.processGroups ?? [], st.selected, id), {
                            id,
                            name: id,
                            position: {
                                x: Math.min(st.newProcessGroup.from.x, st.newProcessGroup.to!.x),
                                y: Math.min(st.newProcessGroup.from.y, st.newProcessGroup.to!.y)
                            },
                            size: {
                                width: Math.abs(st.newProcessGroup.to!.x - st.newProcessGroup.from.x),
                                height: Math.abs(st.newProcessGroup.to!.y - st.newProcessGroup.from.y)
                            },
                            parentGroup: findProcessGroup(st, st.newProcessGroup.from),
                            parameterContext: null
                        }]),
                        processors: setComponentGroupParents(st.flow.processors, st.selected, id),
                        funnels: setComponentGroupParents(st.flow.funnels, st.selected, id),
                        processGroupsPorts: setComponentGroupParents(st.flow.processGroupsPorts ?? [], st.selected, id),
                        remoteProcessGroups: setComponentGroupParents(st.flow.remoteProcessGroups ?? [], st.selected, id)
                    },
                    selected: []
                };
            }
            if (!st.newConnection) return st;
            if (typeof st.newConnection?.to === "string") {
                const newConn = createDefaultConnection(st.flow, st.newConnection.source, st.newConnection.to, st.newConnection.midPoint);
                return {...st, flow: {...st.flow, connections: [...st.flow.connections, newConn]}, newConnection: null};
            }
            const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
            if (st.newConnection?.to) {
                return {
                    ...st,
                    newComponent: {
                        x,
                        y,
                        type: "PROCESSOR",
                        srcProcessor: st.newConnection.source,
                        parentGroup: findProcessGroup(st, {x, y})
                    }
                };
            }
            return {...st, newConnection: {...st.newConnection, to: {x, y}}};
        });
    }, [])

    const services = React.useContext(ServiceContext);
    const navigate = useNavigate();

    const notif = React.useContext(NotificationContext);

    const isSavePending = React.useRef(false);

    React.useEffect(() => {
        let errors: ErrorObject[] = [];
        for (let proc of state.flow.processors) {
            const proc_manifest = state.flow.manifest.processors.find(proc_manifest => proc_manifest.type === proc.type)!;
            for (let rel in proc.autoterminatedRelationships) {
                const conn = state.flow.connections.find(conn => conn.source.id === proc.id && (rel in conn.sourceRelationships) && conn.sourceRelationships[rel]);
                if (conn && proc.autoterminatedRelationships[rel]) {
                    errors.push({
                        component: proc.id,
                        type: "RELATIONSHIP",
                        target: rel,
                        message: `Relationship '${rel}' is both connected and auto-terminated`
                    });
                }
                if (!conn && (!(rel in proc.autoterminatedRelationships) || !proc.autoterminatedRelationships[rel])) {
                    errors.push({
                        component: proc.id,
                        type: "RELATIONSHIP",
                        target: rel,
                        message: `Relationship '${rel}'  has to be either connected or auto-terminated`
                    });
                }
            }
            for (let property_key in proc.properties) {
                let is_required = proc_manifest.propertyDescriptors?.[property_key].required ?? false;
                let is_null = proc.properties[property_key] === null;
                if (is_required && is_null) {
                    errors.push({
                        component: proc.id,
                        type: "PROPERTY",
                        target: property_key,
                        message: `Property '${property_key}' is required`
                    });
                }

                if (proc.properties[property_key]) {
                    const asset_pattern = /@\{asset-id:([^}]*)\}/g;
                    const ms = proc.properties[property_key]?.matchAll?.(asset_pattern);
                    if (ms) {
                        for (const m of ms) {
                            const find_asset: (entries: FlowAssetDirectory['entries'])=>boolean = (entries) => {
                                return entries.some(entry => {
                                    if ('entries' in entry) {
                                        return find_asset(entry.entries);
                                    }
                                    return entry.id === m[1];
                                })
                            }
                            if (!find_asset(state.flow.assets ?? [])) {
                                errors.push({
                                    component: proc.id,
                                    type: "PROPERTY",
                                    target: property_key,
                                    message: `No such asset '${m[1]}' id`
                                });
                            }
                        }
                    }
                }

            }
        }
        setErrors(errors);
    }, [state.flow])

    React.useEffect(() => {
        if (state.flow === props.flow) return;
        let mounted = true;
        setState(st => ({...st, saved: false}));
        const id = setTimeout(() => {
            if (isSavePending.current) return;
            isSavePending.current = true;
            services?.flows.save(props.id, state.flow).then(id => {
                isSavePending.current = false;
                if (!mounted) return;
                setState(st => ({...st, saved: true}));
                if (id !== props.id) {
                    navigate(`/flow/${id}`);
                }
                //notif.emit("Successfully saved", "success");
            });
        }, 500);
        return () => {
            mounted = false;
            clearTimeout(id);
        }
    }, [state.flow, props.id]);

    const flowContext = useFlowContext(areaRef, state, setState);

    React.useEffect(() => {
        const mousemove = (e: MouseEvent) => {
            setState(st => {
                if (st.newComponent || st.editingComponent || st.publish.modal) return st;
                if (st.newProcessGroup?.from) {
                    const {x, y} = toAreaCoords(areaRef, st, e);
                    const area = {
                        x: Math.min(x, st.newProcessGroup.from.x), y: Math.min(y, st.newProcessGroup.from.y),
                        width: Math.abs(x - st.newProcessGroup.from.x),
                        height: Math.abs(y - st.newProcessGroup.from.y),
                    }
                    return {
                        ...st,
                        newProcessGroup: {...st.newProcessGroup, to: {x, y}},
                        selected: FindVisibleComponents(st.flow, area).map(item => item.id)
                    };
                }
                if (st.movingComponent) {
                    if (st.flow.connections.find(conn => conn.id === st.movingComponent!.id)) {
                        return moveConnectionImpl(st, st.movingComponent.id, e.movementX, e.movementY);
                    } else {
                        const {x, y} = toAreaCoords(areaRef, st, e);
                        if (!st.movingComponent.original) {
                            return {
                                ...st,
                                movingComponent: {
                                    ...st.movingComponent,
                                    original: moveComponentImpl(st, st.movingComponent.id, null).original?.position ?? null,
                                    start: {x, y}
                                }
                            };
                        } else {
                            const new_pos = {
                                x: st.movingComponent.original.x + x - st.movingComponent.start!.x,
                                y: st.movingComponent.original.y + y - st.movingComponent.start!.y
                            };
                            const new_state = moveComponentImpl(st, st.movingComponent.id, new_pos).state;
                            return updateProcessGroupChildren(new_state, st.movingComponent.id, x, y);
                        }
                    }
                }
                if (st.newConnection && st.newConnection.to) {
                    const {x, y} = toAreaCoords(areaRef, st, e);
                    const proc = findConnDestProc(st, {x, y});
                    if (proc) {
                        if (proc.id === st.newConnection.source) {
                            let vx = x - (proc.position.x + width(proc) / 2);
                            let vy = y - (proc.position.y + height(proc) / 2);
                            const d = Math.sqrt(vx ** 2 + vy ** 2);
                            vx = vx * (Math.max(width(proc) / 2, height(proc) / 2) + 50) / d;
                            vy = vy * (Math.max(width(proc) / 2, height(proc) / 2) + 50) / d;
                            return {...st, newConnection: {...st.newConnection, to: proc.id, midPoint: {x: vx, y: vy}}};
                        }
                        return {...st, newConnection: {...st.newConnection, to: proc.id, midPoint: null}};
                    }
                    return {...st, newConnection: {...st.newConnection, to: {x, y}, midPoint: null}}
                }
                if (st.resizeGroup && st.resizeGroup.active) {
                    // handle resizing
                    const group = st.flow.processGroups?.find(group => group.id === st.resizeGroup?.id);
                    if (!group) {
                        return st;
                    }
                    let new_group: ProcessGroup | undefined;
                    if (st.resizeGroup!.direction === 'top') {
                        const new_groups = st.flow.processGroups!.map(curr => {
                            if (curr.id !== group.id) return curr;
                            return new_group = {
                                ...curr,
                                position: {...curr.position, y: curr.position.y + e.movementY},
                                size: {...curr.size!, height: curr.size!.height - e.movementY}
                            };
                        });
                        // const ids = collectGroupDescendants(new_groups, group.id);
                        return {
                            ...st, flow: {
                                ...st.flow,
                                processGroups: new_groups,
                                // processGroups: moveGroupChildren(new_groups, ids, 0, e.movementY),
                                // processors: moveGroupChildren(st.flow.processors, ids, 0, e.movementY),
                                // funnels: moveGroupChildren(st.flow.funnels, ids, 0, e.movementY),
                                processGroupsPorts: moveGroupPorts(st.flow.processGroupsPorts ?? [], new_group)
                            }
                        }
                    }
                    if (st.resizeGroup!.direction === 'bottom') {
                        const new_groups = st.flow.processGroups?.map(curr => {
                            if (curr.id !== group.id) return curr;
                            return new_group = {
                                ...curr,
                                size: {...curr.size!, height: curr.size!.height + e.movementY}
                            };
                        });
                        return {
                            ...st, flow: {
                                ...st.flow,
                                processGroups: new_groups,
                                processGroupsPorts: moveGroupPorts(st.flow.processGroupsPorts ?? [], new_group)
                            }
                        }
                    }
                    if (st.resizeGroup!.direction === 'left') {
                        const new_groups = st.flow.processGroups!.map(curr => {
                            if (curr.id !== group.id) return curr;
                            return new_group = {
                                ...curr,
                                position: {...curr.position, x: curr.position.x + e.movementX},
                                size: {...curr.size!, width: curr.size!.width - e.movementX}
                            };
                        });
                        // const ids = collectGroupDescendants(new_groups, group.id);
                        return {
                            ...st, flow: {
                                ...st.flow,
                                processGroups: new_groups,
                                // processGroups: moveGroupChildren(new_groups, ids, e.movementX, 0),
                                // processors: moveGroupChildren(st.flow.processors, ids, e.movementX, 0),
                                // funnels: moveGroupChildren(st.flow.funnels, ids, e.movementX, 0),
                                processGroupsPorts: moveGroupPorts(st.flow.processGroupsPorts ?? [], new_group)
                            }
                        }
                    }
                    if (st.resizeGroup!.direction === 'right') {
                        const new_groups = st.flow.processGroups?.map(curr => {
                            if (curr.id !== group.id) return curr;
                            return new_group = {...curr, size: {...curr.size!, width: curr.size!.width + e.movementX}};
                        });
                        return {
                            ...st, flow: {
                                ...st.flow,
                                processGroups: new_groups,
                                processGroupsPorts: moveGroupPorts(st.flow.processGroupsPorts ?? [], new_group)
                            }
                        }
                    }
                    if (st.resizeGroup!.direction === 'top-left') {
                        const new_groups = st.flow.processGroups!.map(curr => {
                            if (curr.id !== group.id) return curr;
                            return new_group = {
                                ...curr,
                                position: {x: curr.position.x + e.movementX, y: curr.position.y + e.movementY},
                                size: {width: curr.size!.width - e.movementX, height: curr.size!.height - e.movementY}
                            };
                        });
                        // const ids = collectGroupDescendants(new_groups, group.id);
                        return {
                            ...st, flow: {
                                ...st.flow,
                                processGroups: new_groups,
                                // processGroups: moveGroupChildren(new_groups, ids, e.movementX, e.movementY),
                                // processors: moveGroupChildren(st.flow.processors, ids, e.movementX, e.movementY),
                                // funnels: moveGroupChildren(st.flow.funnels, ids, e.movementX, e.movementY),
                                processGroupsPorts: moveGroupPorts(st.flow.processGroupsPorts ?? [], new_group)
                            }
                        }
                    }
                    if (st.resizeGroup!.direction === 'top-right') {
                        const new_groups = st.flow.processGroups!.map(curr => {
                            if (curr.id !== group.id) return curr;
                            return new_group = {
                                ...curr,
                                position: {x: curr.position.x, y: curr.position.y + e.movementY},
                                size: {width: curr.size!.width + e.movementX, height: curr.size!.height - e.movementY}
                            };
                        });
                        // const ids = collectGroupDescendants(new_groups, group.id);
                        return {
                            ...st, flow: {
                                ...st.flow,
                                processGroups: new_groups,
                                // processGroups: moveGroupChildren(new_groups, ids, 0, e.movementY),
                                // processors: moveGroupChildren(st.flow.processors, ids, 0, e.movementY),
                                // funnels: moveGroupChildren(st.flow.funnels, ids, 0, e.movementY),
                                processGroupsPorts: moveGroupPorts(st.flow.processGroupsPorts ?? [], new_group)
                            }
                        }
                    }
                    if (st.resizeGroup!.direction === 'bottom-left') {
                        const new_groups = st.flow.processGroups!.map(curr => {
                            if (curr.id !== group.id) return curr;
                            return new_group = {
                                ...curr,
                                position: {x: curr.position.x + e.movementX, y: curr.position.y},
                                size: {width: curr.size!.width - e.movementX, height: curr.size!.height + e.movementY}
                            };
                        });
                        // const ids = collectGroupDescendants(new_groups, group.id);
                        return {
                            ...st, flow: {
                                ...st.flow,
                                processGroups: new_groups,
                                // processGroups: moveGroupChildren(new_groups, ids, e.movementX, 0),
                                // processors: moveGroupChildren(st.flow.processors, ids, e.movementX, 0),
                                // funnels: moveGroupChildren(st.flow.funnels, ids, e.movementX, 0),
                                processGroupsPorts: moveGroupPorts(st.flow.processGroupsPorts ?? [], new_group)
                            }
                        }
                    }
                    if (st.resizeGroup!.direction === 'bottom-right') {
                        const new_groups = st.flow.processGroups?.map(curr => {
                            if (curr.id !== group.id) return curr;
                            return {
                                ...curr,
                                size: {width: curr.size!.width + e.movementX, height: curr.size!.height + e.movementY}
                            };
                        });
                        return {
                            ...st, flow: {
                                ...st.flow,
                                processGroups: new_groups,
                                processGroupsPorts: moveGroupPorts(st.flow.processGroupsPorts ?? [], new_group)
                            }
                        }
                    }
                    return st;
                }
                if (!st.panning) {
                    if (st.menu) return st;
                    const {x, y} = toAreaCoords(areaRef, st, e);
                    const proc = findConnSourceProc(st, {x, y});
                    if (!proc) {
                        const group = findGroup(st, {x, y});
                        if (group) {
                            return {
                                ...st,
                                resizeGroup: {id: group.group.id, direction: group.dir, active: false},
                                newConnection: null
                            };
                        }
                        if (!st.newConnection && !st.resizeGroup) return st;
                        return {...st, newConnection: null, resizeGroup: null}
                    }
                    return {...st, newConnection: {source: proc.id, to: null, midPoint: null}, resizeGroup: null};
                }

                return {
                    ...st,
                    flow: {
                        ...st.flow,
                        view: {
                            x: st.flow.view.x - e.movementX / st.flow.view.zoom,
                            y: st.flow.view.y - e.movementY / st.flow.view.zoom,
                            zoom: st.flow.view.zoom
                        }
                    }
                }
            })
        }

        const mouseup = (e: MouseEvent) => {
            setState(st => {
                if (st.newComponent || st.editingComponent || st.publish.modal) return st;
                if (st.movingComponent) {
                    return {...st, movingComponent: null}
                }
                if (!st.panning && !st.resizeGroup) return st;
                if (st.resizeGroup) {
                    return {...st, resizeGroup: {...st.resizeGroup, active: false}};
                }
                return {...st, panning: false};
                // if (!st.panning && !st.newConnection && !st.resizeGroup) return st;
                // if (typeof st.newConnection?.to === "string") {
                //   const newConn = createDefaultConnection(st.flow, st.newConnection.source, st.newConnection.to, st.newConnection.midPoint);
                //   return {...st, flow: {...st.flow, connections: [...st.flow.connections, newConn]}, newConnection: null};
                // }
                // const {x, y} = toAreaCoords(areaRef, st, e);
                // if (st.newConnection) {
                //   return {...st, newComponent: {x, y, type: "PROCESSOR", srcProcessor: st.newConnection.source, parentGroup: findProcessGroup(st, {x, y})}};
                // }
                // if (st.resizeGroup) {
                //   return {...st, resizeGroup: {...st.resizeGroup, active: false}};
                // }
                // let newConnection: NewConnection | null = null;
                // const proc = findConnSourceProc(st, {x, y});
                // if (proc) {
                //   newConnection = {source: proc.id, to: null, midPoint: null};
                // }
                // return {...st, panning: false, newConnection};
            })
        }


        document.addEventListener("mousemove", mousemove);
        document.addEventListener("mouseup", mouseup);
        return () => {
            document.removeEventListener("mousemove", mousemove);
            document.removeEventListener("mouseup", mouseup);
        }
    }, [])

    const newComponent = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        const {clientX, clientY} = e;
        flowContext.showMenu({clientX, clientY}, [
            {
                name: "Add processor", on: () => {
                    setState(st => {
                        const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
                        return {
                            ...st,
                            newComponent: {x, y, type: "PROCESSOR", parentGroup: findProcessGroup(st, {x, y})}
                        };
                    })
                    flowContext.hideMenu();
                }
            },
            {
                name: "Add service", on: () => {
                    setState(st => {
                        const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
                        return {...st, newComponent: {x, y, type: "SERVICE", parentGroup: null}};
                    })
                    flowContext.hideMenu();
                }
            },
            {
                name: "Add process group", on: () => {
                    setState(st => {
                        const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
                        const id = uuid.v4() as Uuid;
                        return {...st, newProcessGroup: {from: null, to: null}};
                        // return {...st, flow: {...st.flow, processGroups: [...(st.flow.processGroups ?? []), {id, name: id, position: {x, y}, size: {width: 200, height: 200}, parentGroup: findProcessGroup(st, {x, y}), parameterContext: null}]}};
                    })
                    flowContext.hideMenu();
                }
            },
            {
                name: "Add funnel", on: () => {
                    setState(st => {
                        const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
                        const id = uuid.v4() as Uuid;
                        return {
                            ...st,
                            flow: {
                                ...st.flow,
                                funnels: [...st.flow.funnels, {
                                    id,
                                    name: id,
                                    position: {x, y},
                                    parentGroup: findProcessGroup(st, {x, y}),
                                    type: 'Funnel',
                                    properties: {}
                                }]
                            }
                        };
                    })
                    flowContext.hideMenu();
                }
            },
            {
                name: "Add input port", on: () => {
                    setState(st => {
                        const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
                        const id = uuid.v4() as Uuid;
                        return {
                            ...st,
                            flow: {
                                ...st.flow,
                                processGroupsPorts: [...(st.flow.processGroupsPorts ?? []), {
                                    id,
                                    name: id,
                                    position: {x, y},
                                    parentGroup: findProcessGroup(st, {x, y}),
                                    type: 'INPUT',
                                    properties: {}
                                }]
                            }
                        };
                    })
                    flowContext.hideMenu();
                }
            },
            {
                name: "Add output port", on: () => {
                    setState(st => {
                        const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
                        const id = uuid.v4() as Uuid;
                        return {
                            ...st,
                            flow: {
                                ...st.flow,
                                processGroupsPorts: [...(st.flow.processGroupsPorts ?? []), {
                                    id,
                                    name: id,
                                    position: {x, y},
                                    parentGroup: findProcessGroup(st, {x, y}),
                                    type: 'OUTPUT',
                                    properties: {}
                                }]
                            }
                        };
                    })
                    flowContext.hideMenu();
                }
            },
            {
                name: "Add parameter context", on: () => {
                    setState(st => {
                        const {x, y} = toAreaCoords(areaRef, st, {clientX, clientY});
                        const id = uuid.v4() as Uuid;
                        return {
                            ...st,
                            flow: {
                                ...st.flow,
                                parameterContexts: [...(st.flow.parameterContexts ?? []), {
                                    id,
                                    name: id,
                                    position: {x, y},
                                    parentGroup: null,
                                    type: 'ParameterContext',
                                    properties: {},
                                    description: '',
                                    parameters: []
                                }]
                            }
                        };
                    })
                    flowContext.hideMenu();
                }
            },
        ])
    }, [flowContext.showMenu, flowContext.hideMenu]);

    React.useEffect(() => {
        if (state.newComponent || state.editingComponent) {
            return;
        }
        if (state.resizeGroup) {
            if (state.resizeGroup.direction === 'top' || state.resizeGroup.direction === 'bottom') {
                document.body.classList.add("top-bottom-cursor");
                return () => {
                    document.body.classList.remove("top-bottom-cursor");
                }
            }
            if (state.resizeGroup.direction === 'left' || state.resizeGroup.direction === 'right') {
                document.body.classList.add("left-right-cursor");
                return () => {
                    document.body.classList.remove("left-right-cursor");
                }
            }
            if (state.resizeGroup.direction === 'top-left' || state.resizeGroup.direction === 'bottom-right') {
                document.body.classList.add("top-left-cursor");
                return () => {
                    document.body.classList.remove("top-left-cursor");
                }
            }
            if (state.resizeGroup.direction === 'top-right' || state.resizeGroup.direction === 'bottom-left') {
                document.body.classList.add("top-right-cursor");
                return () => {
                    document.body.classList.remove("top-right-cursor");
                }
            }
        }
        if (state.newConnection) {
            document.body.classList.add("link-cursor");
            return () => {
                document.body.classList.remove("link-cursor");
            }
        }
        return;
    }, [!!state.newConnection, !!state.newComponent, !!state.editingComponent, state.resizeGroup?.direction]);

    React.useEffect(() => {
        if (!state.newProcessGroup) {
            return;
        }
        document.body.classList.add("crosshair-cursor");
        return () => {
            document.body.classList.remove("crosshair-cursor");
        }
    }, [!!state.newProcessGroup]);

    const setPublishState = React.useCallback((fn: (val: PublishState) => PublishState) => {
        setState(state => {
            const new_publish_state = fn(state.publish);
            if (new_publish_state === state.publish) {
                return state;
            }
            return {...state, publish: new_publish_state};
        })
    }, [setState])

    React.useEffect(() => {
        let mounted = true;
        const recurring = !!(state.publish?.targetFlow);
        let id: any;
        const updateAgentState = () => {
            if (!mounted) return;
            services?.agents.fetchAll().then(agents => {
                if (!mounted) return;
                setPublishState(curr => {
                    let newState: PublishState = {...curr, agents: [], classes: []};
                    for (const agent of agents) {
                        if (typeof agent.class !== "string") {
                            newState.agents.push({
                                type: "agent",
                                id: agent.id,
                                class: null,
                                selected: false,
                                last_heartbeat: agent.last_heartbeat,
                                flow: agent.flow,
                                flow_update_error: agent.flow_update_error
                            });
                        } else {
                            let clazz = newState.classes.find(clazz => clazz.id === agent.class);
                            if (!clazz) {
                                clazz = {type: "class", id: agent.class!, selected: false, agents: []};
                                newState.classes.push(clazz);
                            }
                            clazz.agents.push({
                                type: "agent",
                                id: agent.id,
                                class: agent.class,
                                selected: false,
                                last_heartbeat: agent.last_heartbeat,
                                flow: agent.flow,
                                flow_update_error: agent.flow_update_error
                            });
                        }
                    }
                    newState.agents = newState.agents.sort((a, b) => StringCmp(a.id, b.id));
                    newState.classes = newState.classes.map(clazz => ({
                        ...clazz,
                        agents: clazz.agents.sort((a, b) => StringCmp(a.id, b.id))
                    })).sort((a, b) => StringCmp(a.id, b.id));

                    if (curr) {
                        newState.agents = newState.agents.map(new_agent => {
                            const prev = curr.agents.find(agent => agent.id === new_agent.id);
                            if (!prev) {
                                return new_agent;
                            }
                            return {...new_agent, selected: prev.selected};
                        });
                        newState.classes = newState.classes.map(new_class => {
                            const prev_class = curr.classes.find(clazz => clazz.id === new_class.id);
                            if (!prev_class) {
                                return new_class;
                            }
                            return {
                                ...new_class, selected: prev_class.selected, agents: new_class.agents.map(new_agent => {
                                    const prev = prev_class.agents.find(agent => agent.id === new_agent.id);
                                    if (!prev) {
                                        return new_agent;
                                    }
                                    return {...new_agent, selected: prev.selected};
                                })
                            };
                        });
                    }

                    let has_pending_agent = false;
                    for (const agent of newState.agents) {
                        if (!agent.selected) continue;
                        if (agent.flow === newState.targetFlow) continue;
                        if (agent.flow_update_error?.target_flow === newState.targetFlow) continue;
                        has_pending_agent = true;
                    }
                    for (const clazz of newState.classes) {
                        for (const agent of clazz.agents) {
                            if (!agent.selected) continue;
                            if (agent.flow === newState.targetFlow) continue;
                            if (agent.flow_update_error?.target_flow === newState.targetFlow) continue;
                            has_pending_agent = true;
                        }
                    }

                    newState.pending = has_pending_agent;

                    return newState;
                });
                if (recurring) {
                    id = setTimeout(updateAgentState, 1000);
                }
            })
        };
        updateAgentState();
        return () => {
            mounted = false;
            clearTimeout(id);
        }
    }, [!!(state.publish?.targetFlow), setPublishState]);

    const rearrange = async () => {
        const new_flow = await calculateNewLayout(state);
        setState((st: FlowEditorState) => ({...st, flow: new_flow, saved: false}));

        services?.flows.save(props.id, state.flow).then(id => {
            isSavePending.current = false;
            setState(st => ({...st, saved: true}));
            if (id !== props.id) {
                navigate(`/flow/${id}`);
            }
            //notif.emit("Successfully saved", "success");
        });
    }

    const setAssets = React.useCallback((fn: (assets: NonNullable<FlowObject['assets']>)=>NonNullable<FlowObject['assets']>) => {
        setState(st => ({...st, flow: {...st.flow, assets: fn(st.flow.assets ?? [])}}))
    }, [setState])

    return <FlowContext.Provider value={flowContext}>
        <div className="flow-editor" ref={areaRef} onMouseDown={mousedown} onClick={mouseclick}>
            <div className="background"
                // style={{backgroundPosition: `-${state.flow.view.x}px -${state.flow.view.y}px`}}
                onContextMenu={newComponent}>
                <div className="flow-state">{state.saved ? "Saved" : "Saving..."}</div>
            </div>
            <Surface {...state.flow.view}>
                {
                    state.flow.services.map(service => {
                        const service_errors = errors.filter(err => err.component === service.id);
                        return <Widget key={service.id} value={service} errors={service_errors} kind='service'/>
                    })
                }
                {
                    state.flow.parameterContexts?.map(ctx => {
                        return <Widget key={ctx.id} value={ctx} kind='parameter-context'/>
                    })
                }
                {
                    emitProcessGroupItems(state, errors, null, null)
                }
                {
                    (() => {
                        const group_containers = new Map<Uuid, PositionableGroup>();
                        return state.flow.processGroups?.map(group => {
                            return emitProcessGroupItems(state, errors, group, group_containers);
                        }).flat()
                    })()
                }
                {
                    !(state.newConnection?.to) ? null : (() => {
                        const src = FindComponent(state.flow, state.newConnection.source);
                        if (!src) return null;
                        let to: { x: number, y: number, w: number, h: number, circular: boolean };
                        if (typeof state.newConnection.to === "string") {
                            const dest = FindComponent(state.flow, state.newConnection.to);
                            if (!dest) return null;
                            to = {
                                x: dest.position.x + width(dest) / 2,
                                y: dest.position.y + height(dest) / 2,
                                w: width(dest) + 2 * padding,
                                h: height(dest) + 2 * padding,
                                circular: dest.size?.circular ?? true
                            };
                        } else {
                            to = {...state.newConnection.to, w: 0, h: 0, circular: true};
                        }
                        return <ConnectionView key={`new-connection`} from={{
                            x: src.position.x + width(src) / 2,
                            y: src.position.y + height(src) / 2,
                            w: width(src) + 2 * padding,
                            h: height(src) + 2 * padding,
                            circular: src.size?.circular ?? true
                        }}
                                               to={to} midPoint={state.newConnection.midPoint ?? undefined}/>
                    })()
                }
                {
                    state.menu ? <div className="menu-container"
                                      style={{left: `${state.menu.position.x}px`, top: `${state.menu.position.y}px`}}>
                        <Menu items={state.menu.items}/>
                    </div> : null
                }
                {
                    state.newProcessGroup?.from ? <div className="new-process-group" style={{
                            left: `${Math.min(state.newProcessGroup!.from.x, state.newProcessGroup!.to!.x)}px`,
                            top: `${Math.min(state.newProcessGroup!.from.y, state.newProcessGroup!.to!.y)}px`,
                            width: `${Math.abs(state.newProcessGroup!.from.x - state.newProcessGroup!.to!.x)}px`,
                            height: `${Math.abs(state.newProcessGroup!.from.y - state.newProcessGroup!.to!.y)}px`
                        }}/>
                        : null
                }
            </Surface>
            <div className="flow-info">
                <AssetManager assets={state.flow.assets} setAssets={setAssets} />
            </div>
            <div className="publish-buttons">
                <div className="open-publish"
                     onClick={() => setState(st => ({...st, publish: {...st.publish, modal: true}}))}>
                    <span className="label">Publish</span>
                    <div className="publish-loader"/>
                </div>

                <div className="export-btn" onClick={() => handleExport(props.id, services)}>
                    <span className="label">Export</span>
                </div>

                <div className="rearrange-btn" onClick={rearrange}>
                    <span className="label">Rearrange</span>
                </div>
            </div>
            {
                !state.publish.modal ? null :
                    <div className="publish-container">
                        <div className="overlay"
                             onClick={() => setState(st => ({...st, publish: {...st.publish, modal: false}}))}/>
                        <PublishModal state={state.publish} setPublishState={setPublishState}
                                      onCancel={() => setState(st => ({...st, publish: {...st.publish, modal: false}}))}
                                      onPublish={!state.publish.pending ? (agents, classes) => {
                                          setPublishState(st => ({...st, targetFlow: props.id, pending: true}));
                                          services?.flows.publish(props.id, agents, classes).then(() => {
                                              notif.emit("Flow update triggered", "success");
                                          })
                                      } : undefined}/>
                    </div>
            }
            {
                !state.editingComponent ? null :
                    <div className="component-editor-container">
                        <div className="overlay" onClick={flowContext.closeComponentEditor}/>
                        <ComponentEditor>{
                            (() => {
                                const conn = state.flow.connections.find(conn => conn.id === state.editingComponent);
                                if (conn) {
                                    return <ConnectionEditor model={conn}/>;
                                }
                                const proc = state.flow.processors.find(proc => proc.id === state.editingComponent);
                                if (proc) {
                                    const proc_manifest = state.flow.manifest.processors.find(proc_manifest => proc_manifest.type === proc.type)!;
                                    const proc_errors = errors.filter(err => err.component === proc.id);
                                    return <ProcessorEditor model={proc} manifest={proc_manifest} errors={proc_errors} minifi_services={state.flow.services} manifest_services={state.flow.manifest.controllerServices}/>
                                }
                                const serv = state.flow.services.find(serv => serv.id === state.editingComponent);
                                if (serv) {
                                    const service_manifest = state.flow.manifest.controllerServices.find(serv_manifest => serv_manifest.type === serv.type)!;
                                    return <ServiceEditor model={serv} manifest={service_manifest}/>
                                }
                                const funnel = state.flow.funnels.find(funnel => funnel.id === state.editingComponent);
                                if (funnel) {
                                    return <FunnelEditor model={funnel}/>
                                }
                                const group = state.flow.processGroups?.find(group => group.id === state.editingComponent);
                                if (group) {
                                    return <ProcessGroupEditor model={group}
                                                               contexts={state.flow.parameterContexts ?? []}/>
                                }
                                const port = state.flow.processGroupsPorts?.find(port => port.id === state.editingComponent);
                                if (port) {
                                    return <ProcessGroupPortEditor model={port}/>
                                }
                                const ctx = state.flow.parameterContexts?.find(ctx => ctx.id === state.editingComponent);
                                if (ctx) {
                                    return <ParameterContextEditor model={ctx}/>
                                }
                                return null;
                            })()
                        }
                        </ComponentEditor>
                    </div>
            }
            {
                (() => {
                    if (!state.newComponent) return null;
                    if (state.newComponent.type === "PROCESSOR") {
                        return <div className="processor-selector-container">
                            <div className="overlay" onClick={() => flowContext.closeNewProcessor(null)}/>
                            <ProcessorSelector processors={state.flow.manifest.processors.map(proc => ({
                                id: proc.type,
                                name: getUnqualifiedName(proc.type),
                                description: proc.typeDescription
                            }))}/>
                        </div>;
                    } else {
                        return <div className="service-selector-container">
                            <div className="overlay" onClick={() => flowContext.closeNewService(null)}/>
                            <ServiceSelector services={state.flow.manifest.controllerServices.map(service => ({
                                id: service.type,
                                name: getUnqualifiedName(service.type),
                                description: service.typeDescription
                            }))}/>
                        </div>;
                    }
                })()
            }
        </div>
    </FlowContext.Provider>
}

function findProcessGroup(st: FlowEditorState, pos: { x: number, y: number }): Uuid | null {
    if (!st.flow.processGroups) return null;
    for (let idx = st.flow.processGroups.length - 1; idx >= 0; --idx) {
        const group = st.flow.processGroups[idx];
        if (!group.size) {
            continue;
        }
        if (group.position.x <= pos.x && pos.x <= group.position.x + width(group) && group.position.y <= pos.y && pos.y < group.position.y + height(group)) {
            return group.id;
        }
    }
    return null;
}

function topSortGroups(groups: ProcessGroup[]): ProcessGroup[] {
    const result: ProcessGroup[] = [];
    for (const group of groups) {
        if (result.indexOf(group) !== -1) continue;
        addDependencies(groups, group, result);
        result.push(group);
    }
    return result;
}

function addDependencies(groups: ProcessGroup[], group: ProcessGroup, result: ProcessGroup[]) {
    if (!group.parentGroup) return;
    const parentGroup = groups.find(p => p.id === group.parentGroup);
    if (!parentGroup) {
        console.error(`Invalid parent group id ${group.parentGroup}`);
        return;
    }
    if (result.indexOf(parentGroup) !== -1) return;
    addDependencies(groups, parentGroup, result);
    result.push(parentGroup);
}

export function emitProcessGroupItems(state: {
    selected: Uuid[],
    flow: FlowObject,
    newConnection?: NewConnection | null,
    resizeGroup?: { id: Uuid, direction: ResizeDir, active: boolean } | null
}, errors: ErrorObject[], group: ProcessGroup | null, containers: Map<Uuid, PositionableGroup> | null) {
    let container: PositionableGroup | null = group;
    if (group && containers) {
        if (group.parentGroup) {
            const parentContainer = containers.get(group.parentGroup)!;
            const left = Math.max(group.position.x, parentContainer.position.x);
            const right = Math.min(group.position.x + width(group), parentContainer.position.x + width(parentContainer));
            const top = Math.max(group.position.y, parentContainer.position.y);
            const bottom = Math.min(group.position.y + height(group), parentContainer.position.y + height(parentContainer));
            container = {
                id: group.id,
                position: {x: left, y: top},
                size: {width: Math.max(right - left, 0), height: Math.max(bottom - top, 0)},
                parentGroup: group.parentGroup
            };
        }
        containers.set(group.id, container!);
    }
    return [
        (group !== null ?
                <ProcessGroupView key={group.id} selected={state.selected.includes(group.id)} model={group}
                                  container={containers?.get(group.parentGroup as any)}
                                  resize={state.resizeGroup?.id === group.id ? state.resizeGroup!.direction : undefined}/>
                : null
        ),
        (
            state.flow.processors.map(proc => {
                if ((proc.parentGroup ?? null) !== (group?.id ?? null)) return null;
                const proc_errors = errors.filter(err => err.component === proc.id);
                return <Widget key={proc.id} kind='processor' container={container}
                               selected={state.selected.includes(proc.id)}
                               errors={proc_errors} highlight={state.newConnection?.to === proc.id} value={proc}
                               link={state.newConnection?.source === proc.id && !state.newConnection.to}/>
            })
        ),
        (
            state.flow.funnels.map(funnel => {
                if ((funnel.parentGroup ?? null) !== (group?.id ?? null)) return null;
                return <Widget key={funnel.id} value={funnel} kind='funnel' container={container}
                               selected={state.selected.includes(funnel.id)}
                               highlight={state.newConnection?.to === funnel.id}
                               link={state.newConnection?.source === funnel.id && !state.newConnection.to}
                />
            })
        ),
        (
            state.flow.processGroupsPorts?.map(port => {
                if ((port.parentGroup ?? null) !== (group?.id ?? null)) return null;
                return <Widget key={port.id} value={port} kind={port.type === 'INPUT' ? 'input-port' : 'output-port'}
                               target={group}
                               container={group ? containers?.get(group.parentGroup as any) : null}
                               selected={state.selected.includes(port.id)}
                               highlight={state.newConnection?.to === port.id}
                               link={state.newConnection?.source === port.id && !state.newConnection.to}
                />
            })
        ),
        ...state.flow.connections.map(conn => {
            const srcProc = FindComponent(state.flow, conn.source.id);
            const dstProc = FindComponent(state.flow, conn.destination.id);
            if (!srcProc || !dstProc) {
                console.error(`Couldn't find processors for connection '${conn.id}'`);
                return null;
            }
            let conn_container: PositionableGroup | null = null;
            if (!group && !srcProc.parentGroup && !dstProc.parentGroup) {
                // pass
            } else if (group && srcProc.parentGroup === group.id && (!dstProc.parentGroup || containers?.has(dstProc.parentGroup))) {
                conn_container = findCommonAncestor(srcProc.parentGroup, dstProc.parentGroup, containers!);
            } else if (group && dstProc.parentGroup === group.id && (!srcProc.parentGroup || containers?.has(srcProc.parentGroup))) {
                conn_container = findCommonAncestor(srcProc.parentGroup, dstProc.parentGroup, containers!);
            } else {
                return null;
            }
            return <ConnectionView model={conn} key={conn.id} id={conn.id}
                                   from={{
                                       x: srcProc.position.x + width(srcProc) / 2,
                                       y: srcProc.position.y + height(srcProc) / 2,
                                       w: width(srcProc) + 2 * padding,
                                       h: height(srcProc) + 2 * padding,
                                       circular: srcProc.size?.circular ?? true
                                   }}
                                   to={{
                                       x: dstProc.position.x + width(dstProc) / 2,
                                       y: dstProc.position.y + height(dstProc) / 2,
                                       w: width(dstProc) + 2 * padding,
                                       h: height(dstProc) + 2 * padding,
                                       circular: dstProc.size?.circular ?? true
                                   }}
                                   container={conn_container}
                                   selected={state.selected.includes(srcProc.id) && state.selected.includes(dstProc.id)}
                                   name={conn.name ? conn.name : Object.keys(conn.sourceRelationships).filter(key => conn.sourceRelationships[key]).sort().join(", ")}/>
        })
    ]
}

function findCommonAncestor(a: Uuid | null | undefined, b: Uuid | null | undefined, containers: Map<Uuid, PositionableGroup>): PositionableGroup | null {
    if (!a || !b) return null;
    const ancestors: Uuid[] = [a];
    let curr: PositionableGroup | undefined = containers.get(a);
    while (curr?.parentGroup) {
        curr = containers.get(curr.parentGroup)!;
        ancestors.push(curr.id)
    }
    curr = containers.get(b);
    while (curr && !ancestors.includes(curr.id)) {
        curr = curr.parentGroup ? containers.get(curr.parentGroup) : undefined;
    }
    return curr ?? null;
}

function findGroup(st: FlowEditorState, pos: { x: number, y: number }): { group: ProcessGroup, dir: ResizeDir } | null {
    if (!st.flow.processGroups) return null;
    for (const group of st.flow.processGroups) {
        const inner = 10;
        const outer = 10;
        if (!group.size) {
            continue;
        }
        // top border
        if (group.position.y - outer < pos.y && pos.y < group.position.y + inner && group.position.x + inner < pos.x && pos.x < group.position.x + width(group) - inner) {
            return {group, dir: 'top'};
        }
        // bottom border
        if (group.position.y + height(group) - inner < pos.y && pos.y < group.position.y + height(group) + outer && group.position.x + inner < pos.x && pos.x < group.position.x + width(group) - inner) {
            return {group, dir: 'bottom'};
        }
        // left border
        if (group.position.x - outer < pos.x && pos.x < group.position.x + inner && group.position.y + inner < pos.y && pos.y < group.position.y + height(group) - inner) {
            return {group, dir: 'left'};
        }
        // right border
        if (group.position.x + width(group) - inner < pos.x && pos.x < group.position.x + width(group) + outer && group.position.y + inner < pos.y && pos.y < group.position.y + height(group) - inner) {
            return {group, dir: 'right'};
        }
        // top-left
        if (group.position.y - outer < pos.y && pos.y < group.position.y + inner && group.position.x - outer < pos.x && pos.x < group.position.x + inner) {
            return {group, dir: 'top-left'};
        }
        // top-right
        if (group.position.y - outer < pos.y && pos.y < group.position.y + inner && group.position.x + width(group) - inner < pos.x && pos.x < group.position.x + width(group) + outer) {
            return {group, dir: 'top-right'};
        }
        // bottom-left
        if (group.position.y + height(group) - inner < pos.y && pos.y < group.position.y + height(group) + outer && group.position.x - outer < pos.x && pos.x < group.position.x + inner) {
            return {group, dir: 'bottom-left'};
        }
        // bottom-right
        if (group.position.y + height(group) - inner < pos.y && pos.y < group.position.y + height(group) + outer && group.position.x + width(group) - inner < pos.x && pos.x < group.position.x + width(group) + outer) {
            return {group, dir: 'bottom-right'};
        }
    }
    return null;
}

function findConnSourceProc(st: FlowEditorState, pos: { x: number, y: number }) {
    const matcher = (proc: Component) => {
        const inner = 5;
        const outer = 20;
        if (proc.size?.circular || !proc.size) {
            const d = Math.sqrt((proc.position.x + width(proc) / 2 - pos.x) ** 2 + (proc.position.y + height(proc) / 2 - pos.y) ** 2);
            return d > width(proc) / 2 - inner && d < width(proc) / 2 + outer;
        }
        // top border
        if (proc.position.y - outer < pos.y && pos.y < proc.position.y + inner && proc.position.x - outer < pos.x && pos.x < proc.position.x + width(proc) + outer) {
            return true;
        }
        // bottom border
        if (proc.position.y + height(proc) - inner < pos.y && pos.y < proc.position.y + height(proc) + outer && proc.position.x - outer < pos.x && pos.x < proc.position.x + width(proc) + outer) {
            return true;
        }
        // left border
        if (proc.position.x - outer < pos.x && pos.x < proc.position.x + inner && proc.position.y - outer < pos.y && pos.y < proc.position.y + height(proc) + outer) {
            return true;
        }
        // bottom border
        if (proc.position.x + width(proc) - inner < pos.x && pos.x < proc.position.x + width(proc) + outer && proc.position.y - outer < pos.y && pos.y < proc.position.y + height(proc) + outer) {
            return true;
        }
        return false;
    }
    return st.flow.processors.find(matcher) ?? st.flow.funnels.find(matcher) ?? st.flow.processGroupsPorts?.find(matcher);
}

function updateProcessGroupChildren(st: FlowEditorState, id: Uuid, x: number, y: number): FlowEditorState {
    if (!st.flow.processGroups) return st;
    for (let idx = st.flow.processGroups.length - 1; idx >= 0; --idx) {
        const group = st.flow.processGroups[idx];
        if (group.id === id) continue;
        if (group.position.x <= x && x <= group.position.x + width(group) && group.position.y <= y && y <= group.position.y + height(group)) {
            return {
                ...st, flow: {
                    ...st.flow,
                    processors: updateComponentList(st.flow.processors, id, group.id),
                    funnels: updateComponentList(st.flow.funnels, id, group.id),
                    processGroupsPorts: updateComponentList(st.flow.processGroupsPorts ?? [], id, group.id),
                    processGroups: updateComponentList(st.flow.processGroups ?? [], id, group.id),
                }
            }
        }
    }
    return {
        ...st, flow: {
            ...st.flow,
            processors: updateComponentList(st.flow.processors, id, null),
            funnels: updateComponentList(st.flow.funnels, id, null),
            processGroupsPorts: updateComponentList(st.flow.processGroupsPorts ?? [], id, null),
            processGroups: updateComponentList(st.flow.processGroups ?? [], id, null),
        }
    };
}

function setComponentGroupParents<T extends {
    id: Uuid,
    parentGroup: Uuid | null
}>(items: T[], ids: Uuid[], new_parent_group: Uuid | null): T[] {
    if (ids.length === 0) {
        return items;
    }
    return items.map(item => {
        if (ids.includes(item.id)) {
            return {...item, parentGroup: new_parent_group};
        }
        return item;
    })
}

function updateComponentList<T extends {
    id: Uuid,
    parentGroup: Uuid | null
}>(items: T[], id: Uuid, new_parent_group: Uuid | null): T[] {
    const idx = items.findIndex(item => item.id === id);
    if (idx === -1) return items;
    if (items[idx].parentGroup === new_parent_group) return items;
    const new_items = items.slice();
    new_items[idx] = {...items[idx], parentGroup: new_parent_group};
    return new_items;
}

function findConnDestProc(st: FlowEditorState, pos: { x: number, y: number }) {
    const matcher = (proc: Component) => {
        const limit = 50;
        if (proc.size?.circular || !proc.size) {
            const d = Math.sqrt((proc.position.x + width(proc) / 2 - pos.x) ** 2 + (proc.position.y + height(proc) / 2 - pos.y) ** 2);
            if (proc.id !== st.newConnection!.source) {
                return d < width(proc) / 2 + limit;
            } else {
                return d < width(proc) / 2;
            }
        }
        return proc.position.x - limit <= pos.x && pos.x <= proc.position.x + width(proc) + limit &&
            proc.position.y - limit <= pos.y && pos.y <= proc.position.y + height(proc) + limit;
    }
    return st.flow.processors.find(matcher) ?? st.flow.funnels.find(matcher) ?? st.flow.processGroupsPorts?.find(matcher);
}

function toAreaCoords(areaRef: React.RefObject<HTMLDivElement | null>, st: FlowEditorState, e: {
    clientX: number,
    clientY: number
}) {
    const rect = areaRef.current!.getBoundingClientRect();
    const x = st.flow.view.x + (e.clientX - rect.left) / st.flow.view.zoom;
    const y = st.flow.view.y + (e.clientY - rect.top) / st.flow.view.zoom;
    return {x, y};
}

function moveComponentImpl(st: FlowEditorState, id: Uuid, position: { x: number, y: number } | null): {
    state: FlowEditorState,
    original: Positionable | null
} {
    const proc = st.flow.processors.find(proc => proc.id === id);
    if (proc) {
        if (!position) {
            return {state: st, original: proc};
        }
        return {
            state: {
                ...st, flow: {
                    ...st.flow, processors: st.flow.processors.map(proc => {
                        if (proc.id !== id) return proc;
                        return {...proc, position}
                    })
                }
            }, original: proc
        };
    }
    const service = st.flow.services.find(service => service.id === id);
    if (service) {
        if (!position) {
            return {state: st, original: service};
        }
        return {
            state: {
                ...st, flow: {
                    ...st.flow, services: st.flow.services.map(service => {
                        if (service.id !== id) return service;
                        return {...service, position}
                    })
                }
            }, original: service
        };
    }
    const funnel = st.flow.funnels.find(funnel => funnel.id === id);
    if (funnel) {
        if (!position) {
            return {state: st, original: funnel};
        }
        return {
            state: {
                ...st, flow: {
                    ...st.flow, funnels: st.flow.funnels.map(funnel => {
                        if (funnel.id !== id) return funnel;
                        return {...funnel, position}
                    })
                }
            }, original: funnel
        };
    }
    const port = st.flow.processGroupsPorts?.find(port => port.id === id);
    if (port) {
        if (!position) {
            return {state: st, original: port};
        }
        const group = st.flow.processGroups?.find(group => group.id === port.parentGroup);
        let new_position: { x: number, y: number } = {...position};
        let side: 'top' | 'left' | 'right' | 'bottom' | null = null;
        if (group) {
            // snap center to nearest side
            const orig_center = {x: new_position.x + width(port) / 2, y: new_position.y + height(port) / 2};
            let new_center = {...orig_center};
            let min_dist: number = Infinity;
            if (Math.abs(orig_center.y - group.position.y) < min_dist) {
                new_center = {x: orig_center.x, y: group.position.y};
                min_dist = Math.abs(orig_center.y - group.position.y);
                side = 'top';
            }
            if (Math.abs(orig_center.y - group.position.y - height(group)) < min_dist) {
                new_center = {x: orig_center.x, y: group.position.y + height(group)};
                min_dist = Math.abs(orig_center.y - group.position.y - height(group));
                side = 'bottom';
            }
            if (Math.abs(orig_center.x - group.position.x) < min_dist) {
                new_center = {x: group.position.x, y: orig_center.y};
                min_dist = Math.abs(orig_center.x - group.position.x);
                side = 'left';
            }
            if (Math.abs(orig_center.x - group.position.x - width(group)) < min_dist) {
                new_center = {x: group.position.x + width(group), y: orig_center.y};
                min_dist = Math.abs(orig_center.x - group.position.x - width(group));
                side = 'right';
            }
            new_position = {x: new_center.x - width(port) / 2, y: new_center.y - height(port) / 2};
        }
        return {
            state: {
                ...st, flow: {
                    ...st.flow, processGroupsPorts: st.flow.processGroupsPorts!.map(port => {
                        if (port.id !== id) return port;
                        return {...port, position: new_position, side}
                    })
                }
            }, original: port
        };
    }
    const group = st.flow.processGroups?.find(group => group.id === id);
    if (group) {
        if (!position) {
            return {state: st, original: group};
        }
        const new_groups = st.flow.processGroups!.map(group => {
            if (group.id !== id) return group;
            return {...group, position}
        });
        const dx = position.x - group.position.x;
        const dy = position.y - group.position.y;
        const ids = collectGroupDescendants(new_groups, id);
        return {
            state: {
                ...st, flow: {
                    ...st.flow,
                    processGroups: moveGroupChildren(new_groups, ids, dx, dy),
                    processors: moveGroupChildren(st.flow.processors, ids, dx, dy),
                    funnels: moveGroupChildren(st.flow.funnels, ids, dx, dy),
                    processGroupsPorts: moveGroupChildren(st.flow.processGroupsPorts ?? [], ids, dx, dy),
                }
            }, original: group
        };
    }
    const ctx = st.flow.parameterContexts?.find(ctx => ctx.id === id);
    if (ctx) {
        if (!position) {
            return {state: st, original: ctx};
        }
        return {
            state: {
                ...st, flow: {
                    ...st.flow, parameterContexts: st.flow.parameterContexts!.map(ctx => {
                        if (ctx.id !== id) return ctx;
                        return {...ctx, position}
                    })
                }
            }, original: ctx
        };
    }
    console.error(`No component with id '${id}'`);
    return {state: st, original: null};
}

function collectGroupDescendants(groups: ProcessGroup[], id: Uuid, result: Uuid[] = []): Uuid[] {
    result.push(id);
    for (const group of groups) {
        if (group.parentGroup === id) {
            collectGroupDescendants(groups, group.id, result);
        }
    }
    return result;
}

function moveGroupChildren<T extends Positionable & {
    parentGroup: Uuid | null
}>(items: T[], group_ids: Uuid[], dx: number, dy: number): T[] {
    return items.map(item => {
        if (!item.parentGroup || group_ids.indexOf(item.parentGroup) === -1) return item;
        return {...item, position: {x: item.position.x + dx, y: item.position.y + dy}}
    })
}

function clamp_port_x(port: ProcessGroupPort, group: ProcessGroup): number {
    return Math.min(Math.max(port.position.x + width(port) / 2, group.position.x), group.position.x + width(group)) - width(port) / 2;
}

function clamp_port_y(port: ProcessGroupPort, group: ProcessGroup): number {
    return Math.min(Math.max(port.position.y + height(port) / 2, group.position.y), group.position.y + height(group)) - height(port) / 2;
}

function moveGroupPorts(ports: ProcessGroupPort[], group: ProcessGroup | undefined): ProcessGroupPort[] {
    if (!group) return ports;
    return ports.map(port => {
        if (port.parentGroup !== group.id) return port;
        if (port.side === 'top') {
            return {...port, position: {x: clamp_port_x(port, group), y: group.position.y - height(port) / 2}};
        }
        if (port.side === 'left') {
            return {...port, position: {x: group.position.x - width(port) / 2, y: clamp_port_y(port, group)}};
        }
        if (port.side === 'bottom') {
            return {
                ...port,
                position: {x: clamp_port_x(port, group), y: group.position.y + height(group) - height(port) / 2}
            };
        }
        if (port.side === 'right') {
            return {
                ...port,
                position: {x: group.position.x + width(group) - width(port) / 2, y: clamp_port_y(port, group)}
            };
        }
        return port;
    })
}

function moveConnectionImpl(st: FlowEditorState, id: Uuid, dx: number, dy: number): FlowEditorState {
    const conn = st.flow.connections.find(conn => conn.id === id);
    if (!conn) return st;
    const srcProc = FindComponent(st.flow, conn.source.id);
    const dstProc = FindComponent(st.flow, conn.destination.id);
    if (!srcProc || !dstProc) return st;
    const src_x = srcProc.position.x + width(srcProc) / 2;
    const src_y = srcProc.position.y + height(srcProc) / 2;
    const dst_x = dstProc.position.x + width(dstProc) / 2;
    const dst_y = dstProc.position.y + height(dstProc) / 2;
    if (srcProc !== dstProc) {
        // different processors
        let vx = dst_x - src_x;
        let vy = dst_y - src_y;
        const d = Math.sqrt(vx ** 2 + vy ** 2);
        vx /= d;
        vy /= d;
        let [nx, ny] = [-vy, vx];
        const new_distance = (typeof conn.midPoint === "number" ? conn.midPoint : 0) + nx * dx + ny * dy;
        const new_connections = st.flow.connections.filter(conn => conn.id !== id);
        new_connections.push({...conn, midPoint: new_distance});
        return {...st, flow: {...st.flow, connections: new_connections}};
    }
    // loop connection
    const new_midpoint = (typeof conn.midPoint === "object") ? {
        x: conn.midPoint.x + dx,
        y: conn.midPoint.y + dy
    } : {x: dx, y: dy};
    const new_connections = st.flow.connections.filter(conn => conn.id !== id);
    new_connections.push({...conn, midPoint: new_midpoint});
    return {...st, flow: {...st.flow, connections: new_connections}};
}

function useFlowContext(areaRef: React.RefObject<HTMLDivElement | null>, state: FlowEditorState, setState: (value: React.SetStateAction<FlowEditorState>) => void) {
    const showMenu = React.useCallback((position: { clientX: number, clientY: number }, items: {
        name: string,
        on: () => void
    }[]) => {
        setState(st => {
            const {x, y} = toAreaCoords(areaRef, st, position);
            return {...st, menu: {position: {x: x + 5 / st.flow.view.zoom, y: y + 5 / st.flow.view.zoom}, items}};
        })
    }, [])

    const hideMenu = React.useCallback(() => {
        setState(st => ({...st, menu: null}))
    }, [])

    const setMovingComponent = React.useCallback((id: Uuid, moving: boolean) => {
        setState(st => {
            if (!moving && st.movingComponent?.id === id) {
                return {...st, movingComponent: null};
            }
            if (moving) {
                const group_idx = st.flow.processGroups?.findIndex(group => group.id === id) ?? -1;
                if (group_idx !== -1) {
                    if (group_idx !== st.flow.processGroups!.length - 1) {
                        // put active group on the top
                        const new_groups = st.flow.processGroups!.filter(group => group.id !== id);
                        new_groups.push(st.flow.processGroups![group_idx]);
                        return {
                            ...st,
                            flow: {...st.flow, processGroups: topSortGroups(new_groups)},
                            movingComponent: {id, original: null, start: null}
                        };
                    }
                }
                return {...st, movingComponent: {id, original: null, start: null}};
            }
            return st;
        })
    }, [])

    const moveConnection = React.useCallback((id: Uuid, dx: number, dy: number) => {
        setState(st => {
            return moveConnectionImpl(st, id, dx, dy);
        })
    }, []);

    const deleteComponent = React.useCallback((id: Uuid) => {
        setState(st => {
            if (st.flow.processors.find(proc => proc.id === id)) {
                return {
                    ...st,
                    flow: {
                        ...st.flow,
                        processors: st.flow.processors.filter(proc => proc.id !== id),
                        connections: st.flow.connections.filter(conn => conn.id !== id && conn.source.id !== id && conn.destination.id !== id)
                    }
                }
            }
            if (st.flow.connections.find(conn => conn.id === id)) {
                return {...st, flow: {...st.flow, connections: st.flow.connections.filter(conn => conn.id !== id)}}
            }
            if (st.flow.funnels.find(funnel => funnel.id === id)) {
                return {
                    ...st,
                    flow: {
                        ...st.flow,
                        funnels: st.flow.funnels.filter(funnel => funnel.id !== id),
                        connections: st.flow.connections.filter(conn => conn.id !== id && conn.source.id !== id && conn.destination.id !== id)
                    }
                }
            }
            if (st.flow.processGroupsPorts?.find(port => port.id === id)) {
                return {
                    ...st,
                    flow: {
                        ...st.flow,
                        processGroupsPorts: st.flow.processGroupsPorts!.filter(port => port.id !== id),
                        connections: st.flow.connections.filter(conn => conn.id !== id && conn.source.id !== id && conn.destination.id !== id)
                    }
                }
            }
            if (st.flow.processGroups?.find(group => group.id === id)) {
                const group_ids = collectGroupDescendants(st.flow.processGroups!, id);
                const resources: Uuid[] = [];
                for (const item of st.flow.processors) {
                    if (group_ids.includes(item.parentGroup as any)) resources.push(item.id);
                }
                for (const item of st.flow.funnels) {
                    if (group_ids.includes(item.parentGroup as any)) resources.push(item.id);
                }
                for (const item of (st.flow.processGroupsPorts ?? [])) {
                    if (group_ids.includes(item.parentGroup as any)) resources.push(item.id);
                }
                return {
                    ...st, flow: {
                        ...st.flow,
                        processGroups: st.flow.processGroups!.filter(group => group.id !== id && !group_ids.includes(group.parentGroup as any)),
                        processors: st.flow.processors.filter(item => !resources.includes(item.id)),
                        funnels: st.flow.funnels.filter(item => !resources.includes(item.id)),
                        processGroupsPorts: st.flow.processGroupsPorts?.filter(item => !resources.includes(item.id)),
                        connections: st.flow.connections.filter(conn => !resources.includes(conn.source.id) && !resources.includes(conn.destination.id))
                    }
                }
            }
            if (st.flow.parameterContexts?.find(ctx => ctx.id === id)) {
                return {
                    ...st, flow: {
                        ...st.flow,
                        parameterContexts: st.flow.parameterContexts!.filter(ctx => ctx.id !== id),
                        processGroups: st.flow.processGroups?.map(group => {
                            if (group.parameterContext !== id) return group;
                            return {...group, parameterContext: null};
                        })
                    }
                };
            }
            return {...st, flow: {...st.flow, services: st.flow.services.filter(serv => serv.id !== id)}};
        })
    }, []);

    const editComponent = React.useCallback((id: Uuid) => {
        setState(st => {
            return {...st, editingComponent: id};
        })
    }, []);

    const updateProcessor = React.useCallback((id: Uuid, fn: (curr: Processor) => Processor) => {
        setState(st => {
            const curr = st.flow.processors.find(proc => proc.id === id);
            if (!curr) return st;
            const updated = fn(curr);
            const new_procs = st.flow.processors.filter(proc => proc.id !== updated.id);
            new_procs.push(updated);
            let changed_any = false;
            let connections = st.flow.connections;
            const manifest = st.flow.manifest.processors.find(man => man.type === updated.type);
            if (manifest?.supportsDynamicRelationships) {
                connections = st.flow.connections.map(out => {
                    if (out.source.id !== updated.id) return out;
                    let changed = false;
                    const newSourceRelationships: { [name: string]: boolean } = {};
                    for (const rel in out.sourceRelationships) {
                        if (rel in updated.autoterminatedRelationships) {
                            newSourceRelationships[rel] = out.sourceRelationships[rel];
                            continue;
                        }
                        // relationship removed
                        changed = true;
                    }
                    for (const rel in updated.autoterminatedRelationships) {
                        if (rel in newSourceRelationships) continue;
                        // new relationship
                        newSourceRelationships[rel] = false;
                        changed = true;
                    }
                    if (!changed) return out;
                    changed_any = true;
                    return {...out, sourceRelationships: newSourceRelationships};
                });
            }
            if (!changed_any) connections = st.flow.connections;
            return {...st, flow: {...st.flow, processors: new_procs, connections}}
        })
    }, []);

    const updateConnection = React.useCallback((id: Uuid, fn: (curr: Connection) => Connection) => {
        setState(st => {
            const curr = st.flow.connections.find(conn => conn.id === id);
            if (!curr) return st;
            const updated = fn(curr);
            const new_conns = st.flow.connections.filter(conn => conn.id !== updated.id);
            new_conns.push(updated);
            return {...st, flow: {...st.flow, connections: new_conns}}
        })
    }, []);

    const updateService = React.useCallback((id: Uuid, fn: (curr: MiNiFiService) => MiNiFiService) => {
        setState(st => {
            const curr = st.flow.services.find(serv => serv.id === id);
            if (!curr) return st;
            const updated = fn(curr);
            const new_services = st.flow.services.filter(serv => serv.id !== updated.id);
            new_services.push(updated);
            return {...st, flow: {...st.flow, services: new_services}}
        })
    }, []);

    const updateGroup = React.useCallback((id: Uuid, fn: (curr: ProcessGroup) => ProcessGroup) => {
        setState(st => {
            const curr = st.flow.processGroups?.find(group => group.id === id);
            if (!curr) return st;
            const updated = fn(curr);
            if (updated === curr) return st;
            return {
                ...st, flow: {
                    ...st.flow, processGroups: st.flow.processGroups!.map(group => {
                        if (group.id !== id) return group;
                        return updated;
                    })
                }
            }
        })
    }, []);

    const updateFunnel = React.useCallback((id: Uuid, fn: (curr: Funnel) => Funnel) => {
        setState(st => {
            const curr = st.flow.funnels.find(funnel => funnel.id === id);
            if (!curr) return st;
            const updated = fn(curr);
            if (updated === curr) return st;
            return {
                ...st, flow: {
                    ...st.flow, funnels: st.flow.funnels.map(funnel => {
                        if (funnel.id !== id) return funnel;
                        return updated;
                    })
                }
            }
        })
    }, []);

    const updateParameterContext = React.useCallback((id: Uuid, fn: (curr: ParameterContext) => ParameterContext) => {
        setState(st => {
            const curr = st.flow.parameterContexts?.find(ctx => ctx.id === id);
            if (!curr) return st;
            const updated = fn(curr);
            if (updated === curr) return st;
            return {
                ...st, flow: {
                    ...st.flow, parameterContexts: st.flow.parameterContexts!.map(ctx => {
                        if (ctx.id !== id) return ctx;
                        return updated;
                    })
                }
            }
        })
    }, []);

    const updatePort = React.useCallback((id: Uuid, fn: (curr: ProcessGroupPort) => ProcessGroupPort) => {
        setState(st => {
            const curr = st.flow.processGroupsPorts?.find(port => port.id === id);
            if (!curr) return st;
            const updated = fn(curr);
            if (updated === curr) return st;
            return {
                ...st, flow: {
                    ...st.flow, processGroupsPorts: st.flow.processGroupsPorts!.map(port => {
                        if (port.id !== id) return port;
                        return updated;
                    })
                }
            }
        })
    }, []);

    const closeComponentEditor = React.useCallback(() => {
        setState(st => ({...st, editingComponent: null}))
    }, [])

    // React.useEffect(()=>{
    //   const flow = PropagateAttributes(state.flow);
    //   if (flow !== state.flow) setState(curr => ({...curr, flow}));
    // }, [state.flow.connections, state.flow.processors]);

    const closeNewProcessor = React.useCallback((id: string | null) => {
        setState(st => {
            if (!st.newComponent) return st;
            if (id === null) {
                return {...st, newComponent: null, newConnection: null};
            }
            const procManifest = st.flow.manifest.processors.find(proc => proc.type === id);
            if (!procManifest) {
                return {...st, newComponent: null, newConnection: null};
            }
            const name = getUnqualifiedName(id);
            const newProcessor: Processor = {
                position: {x: st.newComponent.x, y: st.newComponent.y},
                id: uuid.v4() as Uuid,
                name: name,
                type: id,
                penalty: mapDefined(st.flow.manifest.schedulingDefaults.penalizationPeriodMillis, val => `${val} ms`, ""),
                yield: mapDefined(st.flow.manifest.schedulingDefaults.yieldDurationMillis, val => `${val} ms`, ""),
                autoterminatedRelationships: createDefaultRelationshipStatus(procManifest.supportedRelationships),
                scheduling: {
                    strategy: mapDefined(st.flow.manifest.schedulingDefaults.defaultSchedulingStrategy, val => `${val}` as any, "TIMER_DRIVEN"),
                    concurrentTasks: mapDefined(st.flow.manifest.schedulingDefaults.defaultMaxConcurrentTasks, val => `${val}`, "1"),
                    runSchedule: mapDefined(st.flow.manifest.schedulingDefaults.defaultSchedulingPeriodMillis, val => `${val} ms`, ""),
                    runDuration: mapDefined(st.flow.manifest.schedulingDefaults.defaultRunDurationNanos, val => `${val} ns`, "")
                },
                bulletinLevel: "WARN",
                properties: createDefaultProperties(procManifest.propertyDescriptors ?? {}),
                visibleProperties: [],
                parentGroup: st.newComponent.parentGroup,
                status: null
            };
            let connections = st.flow.connections;
            if (st.newComponent.srcProcessor) {
                connections = connections.slice();
                connections.push(createDefaultConnection(st.flow, st.newComponent.srcProcessor, newProcessor.id));
            }
            return {
                ...st,
                flow: {...st.flow, processors: [...st.flow.processors, newProcessor], connections},
                newComponent: null,
                newConnection: null
            };
        })
    }, []);

    const closeNewService = React.useCallback((id: string | null) => {
        setState(st => {
            if (!st.newComponent) return st;
            if (id === null) {
                return {...st, newComponent: null};
            }
            const serviceManifest = st.flow.manifest.controllerServices.find(service => service.type === id);
            if (!serviceManifest) {
                return {...st, newComponent: null};
            }
            const name = getUnqualifiedName(id);
            const newSerivce: MiNiFiService = {
                position: {x: st.newComponent.x, y: st.newComponent.y},
                id: uuid.v4() as Uuid,
                name: name,
                type: id,
                properties: createDefaultProperties(serviceManifest.propertyDescriptors ?? {}),
                visibleProperties: []
            };
            return {...st, flow: {...st.flow, services: [...st.flow.services, newSerivce]}, newComponent: null};
        })
    }, [])

    return React.useMemo(() => ({
            showMenu,
            deleteComponent,
            hideMenu,
            editComponent,
            updateProcessor,
            updateConnection,
            updateService,
            updateGroup,
            updateFunnel,
            updateParameterContext,
            updatePort,
            closeComponentEditor,
            closeNewProcessor,
            closeNewService,
            moveConnection,
            setMovingComponent,
            editable: true
        }),
        [showMenu, deleteComponent, hideMenu, editComponent, updateProcessor, updateConnection, updateService,
            updateGroup, updateFunnel, updateParameterContext, updatePort, closeComponentEditor, closeNewProcessor, closeNewService,
            moveConnection, setMovingComponent]);
}

function getUnqualifiedName(name: string) {
    const segments = name.split(".");
    return segments[segments.length - 1];
}

function createDefaultRelationshipStatus(rels: { name: string }[]): { [name: string]: boolean } {
    const result: { [name: string]: boolean } = {};
    for (const {name} of rels) {
        result[name] = false;
    }
    return result;
}

function createDefaultProperties(props: { [name: string]: PropertyDescriptor }): { [name: string]: string | null } {
    console.log(props);
    const result: { [name: string]: string | null } = {};
    for (const name in props) {
        const prop = props[name];
        result[name] = prop.defaultValue ?? null;
    }
    return result;
}

function mapDefined<T, R>(value: T | undefined, fn: (val: T) => R, fallback: R): R {
    if (value === undefined) return fallback;
    return fn(value);
}

function PropagateAttributes(flow: FlowObject): FlowObject {
    const errors = new Map<Connection, string[]>();
    const attributes = new Map<Connection, string[]>();
    const visited = new Set<Processor>();
    for (const proc of flow.processors) {
        VerifyProcessor(flow, proc, visited, attributes, errors);
    }
    let changed = false;
    const connections = flow.connections.map(conn => {
        const new_errors = errors.get(conn) ?? [];
        if (new_errors.length !== conn.errors.length || new_errors.some((err, idx) => err !== conn.errors[idx])) {
            changed = true;
        }
        const attr = attributes.get(conn) ?? [];
        if (attr.length !== conn.attributes.length || attr.some((a, idx) => a !== conn.attributes[idx])) {
            changed = true;
        }
        return {...conn, attributes: attr, errors: new_errors};
    });
    if (!changed) return flow;
    return {...flow, connections};
}

function VerifyProcessor(flow: FlowObject, target: Processor, visited: Set<Processor>, attributes: Map<Connection, string[]>, errors: Map<Connection, string[]>) {
    if (visited.has(target)) return;
    visited.add(target);
    const incoming = flow.connections.filter(conn => conn.destination.id === target.id);
    for (const conn of incoming) {
        const src = flow.processors.find(proc => proc.id === conn.source.id)!;
        VerifyProcessor(flow, src, visited, attributes, errors);
    }
    const manifest = flow.manifest.processors.find(proc => proc.type === target.type);
    if (!manifest) return;
    if (manifest.inputAttributeRequirements) {
        for (const req of manifest.inputAttributeRequirements) {
            if (Eval(target, req.condition!)) {
                for (const attr of GetAttributeCandidates(target, manifest, null, req)) {
                    for (const conn of incoming) {
                        if (!(attributes.get(conn)?.includes(attr))) {
                            let err = errors.get(conn);
                            if (!err) errors.set(conn, err = []);
                            err.push(`Destination processor expects '${attr}' attribute`);
                        }
                    }
                }
            }
        }
    }
    const outgoing = flow.connections.filter(conn => conn.source.id === target.id);
    const input_attributes = Intersect(incoming.map(conn => attributes.get(conn) ?? [])) ?? [];
    for (const conn of outgoing) {
        const attrs = Intersect(Object.keys(conn.sourceRelationships).filter(rel_name => conn.sourceRelationships[rel_name]).map(rel_name => {
            return DetermineOutputAttributes(target, manifest, input_attributes, rel_name);
        }));
        attributes.set(conn, attrs);
    }
}

function DetermineOutputAttributes(processor: Processor, manifest: ProcessorManifest, input_attrs: string[], rel_name: string): string[] {
    const rel = manifest.supportedRelationships.find(rel => rel.name === rel_name);
    let attr_descriptors: AttributeDescriptor[] | undefined = undefined;
    if (rel) {
        attr_descriptors = rel.outputAttributes;
    } else {
        // dynamic property
        attr_descriptors = manifest.dynamicRelationshipAttributes;
    }
    if (!attr_descriptors) return [];

    const output: string[] = [];

    for (const desc of attr_descriptors) {
        const candidates = GetAttributeCandidates(processor, manifest, input_attrs, desc);

        if (Eval(processor, desc.condition!) === true) {
            for (const attr of candidates) {
                if (!output.includes(attr)) output.push(attr);
            }
        }
    }
    return output;
}

function GetAttributeCandidates(processor: Processor, manifest: ProcessorManifest, input_attrs: string[] | null, desc: AttributeDescriptor): string[] {
    let output: string[] = [];
    if (desc.source === "InputAttributes") {
        if (input_attrs === null) {
            console.warn("This does not make sense in this context");
        } else {
            output = [...input_attrs];
        }
    } else if (desc.source === "DynamicProperties") {
        for (const prop in processor.properties) {
            if (prop in manifest.supportedRelationships) continue;
            if (!output.includes(prop)) {
                output.push(prop);
            }
        }
    } else if (desc.source === "Property") {
        const val = processor.properties[desc.value];
        if (val) output = [val];
    } else {
        output = [...desc.source];
    }
    return output;
}

function Intersect(sets: string[][]): string[] {
    let result = sets[0];
    for (let idx = 1; idx < sets.length; ++idx) {
        result = result.filter(val => sets[idx].includes(val));
    }
    return result;
}

function StringCmp(a: string, b: string) {
    if (a < b) return -1;
    if (a === b) return 0;
    return 1;
}

export function FindComponent(flow: FlowObject, id: Uuid): Component | undefined {
    return flow.processors.find(proc => proc.id === id)
        ?? flow.funnels.find(funnel => funnel.id === id)
        ?? flow.processGroupsPorts?.find(port => port.id === id);
}

// finds all visible (not overlapped by process groups or hidden in their parent) components
// whose center is in the area
export function FindVisibleComponents(flow: FlowObject, area: {
    x: number,
    y: number,
    width: number,
    height: number
}): Component[] {
    const filter = (item: Component) => {
        const pos = {x: item.position.x + width(item) / 2, y: item.position.y + height(item) / 2};
        if (area.x <= pos.x && pos.x <= area.x + area.width && area.y <= pos.y && pos.y <= area.y + area.height) {
            return IsVisble(item, pos, flow);
        }
    };
    return [
        ...flow.processors.filter(filter),
        ...flow.funnels.filter(filter),
        ...(flow.processGroupsPorts ?? []).filter(filter),
    ];
}

export function IsVisble(item: Component, pos: { x: number, y: number }, flow: FlowObject): boolean {
    let group_idx = item.parentGroup ? (flow.processGroups ?? []).findIndex(group => group.id == item.parentGroup) : -1;
    if (group_idx != -1) {
        const group = flow.processGroups![group_idx];
        if (pos.x < group.position.x || group.position.x + width(group) < pos.x || pos.y < group.position.y || group.position.y + height(group) < pos.y) {
            return false;
        }
    }
    for (++group_idx; group_idx < (flow.processGroups?.length ?? 0); ++group_idx) {
        const group = flow.processGroups![group_idx];
        if (group.position.x <= pos.x && pos.x <= group.position.x + width(group) && group.position.y <= pos.y || pos.y <= group.position.y + height(group)) {
            return false;
        }
    }
    return true;
}
