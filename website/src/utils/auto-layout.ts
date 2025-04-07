import ELK, {ElkNode} from 'elkjs/lib/elk.bundled.js';

const layoutOptions = {
    'elk.algorithm': 'layered',
    'elk.layered.spacing.nodeNodeBetweenLayers': '200',
    'elk.layered.spacing.edgeNodeBetweenLayers': '200',
    'elk.padding': '[left=100, top=50, right=50, bottom=50]',
    'elk.spacing.edgeNode': '200',
    'elk.spacing.labelNode': '200',
    'elk.spacing.labelLabel' : '200',
    'elk.font.size': '10'
};

function addProcessGroup(root_graph: ElkNode, process_group: ProcessGroup, flow: FlowObject): ElkNode {
    let parent_group = flow.processGroups!.find((g: ProcessGroup) => (g.id === process_group.parentGroup));
    if (!parent_group) {
        let node = root_graph.children!.find((c: ElkNode) => c.id === process_group.id);
        if (!node) {
            root_graph.children!.push({
                id: process_group.id,
                layoutOptions: layoutOptions,
                children: [],
                ports: []
            });
            return root_graph.children![root_graph.children!.length - 1];
        }
        return node;
    }
    let parent_node = addProcessGroup(root_graph, parent_group, flow);
    let node = parent_node.children!.find((c: ElkNode) => c.id === process_group.id);
    if (!node) {
        parent_node.children!.push({
            id: process_group.id,
            layoutOptions: layoutOptions,
            children: [],
            ports: [],
        });
        return parent_node.children![parent_node.children!.length - 1];
    }
    return node;
}

function getProcessGroupNode(root_graph: ElkNode, flow: FlowObject, process_node_id: Uuid|null) : ElkNode {
    if (process_node_id === null) {
        return root_graph;
    }
    let process_node = flow.processGroups!.find((g) => g.id === process_node_id)!;
    console.log("getProcessGroupNode::process_node_id", process_node_id)
    let parent_node = getProcessGroupNode(root_graph, flow, process_node.parentGroup);
    console.log("getProcessGroupNode::parent_node", parent_node)

    return parent_node.children!.find((c: ElkNode) => c.id === process_node_id)!;
}

export function createGraph(flow: FlowObject) {
    const node_width = 100;
    const node_height = 100;

    const root_graph : ElkNode = {
        id: "root",
        layoutOptions: layoutOptions,
        children: [],
        ports: [],
        edges: []
    };

    if (flow.processGroups) {
        for (let process_group of flow.processGroups) {
            addProcessGroup(root_graph, process_group, flow);
            console.log("process_group", root_graph);
        }
    }

    root_graph.children = root_graph.children?.concat(
        flow.services
            .map((service: MiNiFiService) => ({
                id: service.id,
                width: node_width,
                height: node_height,
                labels: [{text: service.name ?? ""}]
            }))
    );

    if (flow.parameterContexts) {
        root_graph.children = root_graph.children?.concat(
            flow.parameterContexts
                .map((parameter_context: ParameterContext) => ({
                    id: parameter_context.id,
                    width: node_width,
                    height: node_height,
                    labels: [{text: parameter_context.name ?? ""}]
                })));
    }

    for (let processor of flow.processors) {
        let parent_node = getProcessGroupNode(root_graph, flow, processor.parentGroup);
        parent_node.children!.push({
            id: processor.id,
            width: node_width,
            height: node_height,
            layoutOptions: layoutOptions,
            labels: [{text: processor.name ?? ""}]
        })
    }
    for (let funnel of flow.funnels) {
        let parent_node = getProcessGroupNode(root_graph, flow, funnel.parentGroup);
        parent_node.children!.push({
            id: funnel.id,
            width: node_width,
            height: node_height,
            layoutOptions: layoutOptions,
            labels: [{text: funnel.name ?? ""}]
        })
    }

    if (flow.processGroupsPorts) {
        for (let process_group_port of flow.processGroupsPorts) {
            let parent_node = getProcessGroupNode(root_graph, flow, process_group_port.parentGroup);
            parent_node.children!.push({
                id: process_group_port.id,
                width: node_width,
                height: node_height,
                layoutOptions: layoutOptions,
                labels: [{text: process_group_port.name ?? ""}]
            })
        }
    }

    root_graph.edges = root_graph.edges?.concat(
        flow.connections
            .map((connection: Connection) => ({
                id: connection.id,
                sources: [connection.source.id],
                targets: [connection.destination.id],
                layoutOptions: layoutOptions,
                labels: [{text: connection.name ?? ""},]
            }))
    )

    return root_graph;
}

export async function autoLayout(flow: FlowObject, graph: ElkNode, process_group_position: {x: number, y: number}|null) {
    const elk = new ELK();
    const rearranged_graph = await elk.layout(graph);
    console.log(rearranged_graph);
    if (!rearranged_graph.children) {
        return;
    }

    if (rearranged_graph.children) {
        for (let child of rearranged_graph.children) {
            if (!child.x || !child.y) {
                console.log("Continue");
                continue;
            }
            let child_x = child.x + (process_group_position ? process_group_position.x : 0);
            let child_y = child.y + (process_group_position ? process_group_position.y : 0);

            let proc = flow.processors.find(processor => processor.id == child.id);
            if (proc) {
                proc.position = { x: child_x, y: child_y};
                continue;
            }
            let funnel = flow.funnels.find(funnel => funnel.id == child.id);
            if (funnel) {
                funnel.position = { x: child_x, y: child_y };
                continue;
            }
            let service = flow.services.find(service => service.id === child.id);
            if (service) {
                service.position = { x: child_x, y: child_y };
                continue;
            }

            if (flow.parameterContexts) {
                let parameter_context = flow.parameterContexts.find(parameter_context => parameter_context.id === child.id);
                if (parameter_context) {
                    parameter_context.position = { x: child_x, y: child_y };
                    continue;
                }
            }
            if (flow.processGroupsPorts) {
                let process_group_port = flow.processGroupsPorts.find(process_group_port => process_group_port.id === child.id);
                if (process_group_port) {
                    process_group_port.position = { x: child_x, y: child_y };
                    continue;
                }
            }
            if (flow.processGroups) {
                let process_group = flow.processGroups.find(process_group => process_group.id == child.id);
                if (process_group) {
                    process_group.position = {x: child_x, y: child_y};
                    process_group.size = {
                        width: child.width ?? 100,
                        height: child.height ?? 100,
                    }
                    await autoLayout(flow, child, process_group.position);
                }
            }
        }
        for (let port of rearranged_graph.ports!) {
            console.log("PORT");
            console.log(port);
            console.log(process_group_position);
            console.log("END_PORT");
            if (flow.processGroupsPorts) {
                if (!port.x || !port.y) {
                    console.log("Continue");
                    continue;
                }
                let child_x = port.x + (process_group_position ? process_group_position.x : 0);
                let child_y = port.y + (process_group_position ? process_group_position.y : 0);
                let process_group_port = flow.processGroupsPorts.find(process_group_port => process_group_port.id === port.id);
                if (process_group_port) {
                    process_group_port.position = {x: child_x, y: child_y};
                }
            }
        }
        for (let connection of flow.connections) {
            connection.midPoint = undefined;
        }
        flow.view = {x: -100, y: -100, zoom: 1}
    }
}
