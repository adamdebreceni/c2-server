import {useContext, useEffect, useState} from "react";
import * as React from "react";
import {ServiceContext} from "../../common/service-context";
import {FlowPreview} from "../flow-preview";

import "./index.scss";
import {ImportModal} from "../import-modal";

interface FlowsState {
    import: ImportState
}

export function Flows() {
    const [state, setState] = useState<FlowsState>({
        import: {modal: false, classes: []},
    });

    const services = useContext(ServiceContext);
    const [flows, setFlows] = useState<FlowLike[]>([]);
    useEffect(() => {
        let isMounted = true;
        services!.flows.fetchAll().then(flows => {
            if (!isMounted) return;
            setFlows(flows);
        })
        return () => {
            isMounted = false
        }
    }, [])

    const setImportState = React.useCallback((fn: (val: ImportState) => ImportState) => {
        setState(state => {
            const new_publish_state = fn(state.import);
            if (new_publish_state === state.import) {
                return state;
            }
            return {...state, import: new_publish_state};
        })
    }, [setState])

    useEffect(() => {
        let isMounted = true;

        async function fetchClasses() {
            try {
                const agent_class_likes = await services?.agents.fetchClasses();
                if (isMounted && agent_class_likes) {
                    setImportState(st => ({
                        ...st,
                        classes: agent_class_likes.map(agent_class_like => agent_class_like.name)
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch classes:", error);
            }
        }

        fetchClasses();

        return () => {
            isMounted = false;
        };
    }, [services]);

    return <div className="flow-list">
        <div className="open-import"
             onClick={() => setState(st => ({...st, import: {...st.import, modal: true}}))}>
            <span className="label">Import</span>
        </div>
        {
            !state.import.modal ? null :
                <div className="import-container">
                    <div className="overlay"
                         onClick={() => setState(st => ({...st, import: {...st.import, modal: false}}))}/>
                    <ImportModal state={state.import} setImportState={setImportState}
                                 onCancel={() => setState(st => ({...st, import: {...st.import, modal: false}}))}
                                 onImport={async (class_str, flow_str) =>
                                 {
                                     await services!.flows.import(class_str, flow_str);
                                     const updatedFlows = await services!.flows.fetchAll();
                                     setFlows(updatedFlows);
                                     setState(st => ({...st, import: {...st.import, modal: false}}));
                                 }}
                    />
                </div>
        }
        {flows.map(flow => <FlowPreview key={flow.id} value={flow}/>)}
    </div>
}