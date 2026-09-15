import * as React from 'react';
import { useContext } from "react";
import { PropertyField } from '../property-input';
import { Fill } from '../fill/Fill';
import { DeleteIcon } from '../../icons/delete';
import { PropertyDropdown } from '../property-dropdown';
import { FlowContext } from '../../common/flow-context';
import { isSpecialInputField } from '../special-input';
import { ModalContext } from '../../common/modal-context';
import { NotificationContext } from '../../common/notification-context';
import { CreateStringModal } from '../create-string-modal';

export function ComponentProperties(props: {model: Component, manifest: ComponentManifest, setModel: (fn: <T extends Component>(curr: T) => T) => void, errors: ErrorObject[], minifi_services?: MiNiFiService[], manifest_services?: ControllerServiceManifest[]}) {
  const flow_context = useContext(FlowContext);
  const openModal = useContext(ModalContext);
  const notif = useContext(NotificationContext);
  const onChangeVisibility = React.useCallback((prop: string) => {
    props.setModel(<T extends Component>(curr: T): T => {
      const idx = curr.visibleProperties?.indexOf(prop) ?? -1;
      if (idx !== -1) {
        const new_props = curr.visibleProperties!.slice();
        new_props.splice(idx, 1);
        return {...curr, visibleProperties: new_props};
      }
      return {...curr, visibleProperties: [...(curr.visibleProperties ?? []), prop]}
    });
  }, [props.setModel]);
  const onNewDynamicProperty = React.useCallback((prop: string) => {
      props.setModel(curr => {
        if (prop in curr.properties) {
          notif.emit(`Property '${prop}' already exists`, "error");
          return curr;
        }
        return {...curr, properties: {...curr.properties, [prop]: {value: "", type: "custom"}}}
      });
    }, [props.setModel]);
    const openCreateDynPropCb = React.useCallback(()=>{
      openModal(<CreateStringModal text="Add Dynamic Property" onSubmit={onNewDynamicProperty}/>);
    }, [onNewDynamicProperty]);
  return <>
    <div className="section">
      <div className="section-title">Properties</div>
      {
        Object.keys(props.model.properties).sort().map(prop_name => {
          let err = props.errors.find(err => err.type === "PROPERTY" && err.target === prop_name);
          if (!props.manifest.propertyDescriptors || !(prop_name in props.manifest.propertyDescriptors)) {
            if (props.manifest.supportsDynamicProperties) {
              // dynamic property
              return null;
            }
            return <div className="non-existent-property">
              <PropertyField key={prop_name} name={prop_name} width="100%" default={props.model.properties[prop_name].value} visible={props.model.visibleProperties?.includes(prop_name) ?? false} onChangeVisibility={onChangeVisibility} error={err?.message} />
              <Fill/>
              {
                flow_context?.editable ?
                <DeleteIcon size={24} onClick={() => {
                  props.setModel(model => {
                    let new_props = {...model.properties};
                    delete new_props[prop_name];
                    return {...model, properties: new_props, visibleProperties: model.visibleProperties?.filter(vis_prop => vis_prop in new_props)};
                  })
                }}/>
                : null
              }
            </div>
          }

          if (isSpecialInputField(props.model.type, prop_name)) {
            return null;
          }
          {
            const values = props.manifest.propertyDescriptors[prop_name].allowableValues;
            if (values) {
              return <PropertyDropdown key={prop_name} name={prop_name} width="100%"
                                        items={values.map(val => val.value)}
                                        initial={props.model.properties[prop_name].value}
                                        onChange={flow_context?.editable ? val => props.setModel(curr => ({
                                          ...curr,
                                          properties: {...curr.properties, [prop_name]: {value: val, type: "custom"}}
                                        })) : undefined}
                                        visible={props.model.visibleProperties?.includes(prop_name) ?? false}
                                        onChangeVisibility={onChangeVisibility} error={err?.message}/>
            }
          }
          {
            const type_provided_by_value = props.manifest.propertyDescriptors[prop_name].typeProvidedByValue;
            if (type_provided_by_value) {
              let values = [];
              if (props.manifest_services && props.minifi_services) {
                for (const minifi_service of props.minifi_services) {
                  let service_manifest = props.manifest_services.find(controller_service_manifest => controller_service_manifest.type === minifi_service.type);
                  if (minifi_service.type === type_provided_by_value.type) {
                    values.push(minifi_service.name);
                  } else if (service_manifest?.providedApiImplementations?.find(impl => impl.type === type_provided_by_value.type)) {
                    values.push(minifi_service.name);
                  }
                }
              }
              if (values.length > 0) {
                return <PropertyDropdown key={prop_name} name={prop_name} width="100%"
                                          items={values}
                                          initial={props.model.properties[prop_name].value}
                                          onChange={flow_context?.editable ? val => props.setModel(curr => ({
                                            ...curr,
                                            properties: {...curr.properties, [prop_name]: {value: val, type: "custom"}}
                                          })) : undefined}
                                          visible={props.model.visibleProperties?.includes(prop_name) ?? false}
                                          onChangeVisibility={onChangeVisibility} error={err?.message}/>
              }
            }
          }

          return <PropertyField key={prop_name} name={prop_name} width="100%" default={props.model.properties[prop_name].value}
              onChange={flow_context?.editable ? val=>props.setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: {value: val, type: "custom"}}})) : undefined} visible={props.model.visibleProperties?.includes(prop_name) ?? false} onChangeVisibility={onChangeVisibility} error={err?.message}/>
        })
      }
    </div>
    {!props.manifest.supportsDynamicProperties ? null :
    <div className="section">
      <div className="section-title">Dynamic Properties<span style={{flexGrow: 1}}/>
        {
          flow_context?.editable ?
          <div className="add-dynamic-property" onClick={openCreateDynPropCb}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div>
          : null
        }
      </div>
      {
        Object.keys(props.model.properties).sort().map(prop_name => {
          if (props.manifest.propertyDescriptors && prop_name in props.manifest.propertyDescriptors) {
            // not dynamic property
            return null;
          }
          return <div className="dynamic-property">
            <PropertyField key={prop_name} name={prop_name} width="100%" default={props.model.properties[prop_name].value} onChange={flow_context?.editable ? val=>props.setModel(curr => ({...curr, properties: {...curr.properties, [prop_name]: {value: val, type: "custom"}}})) : undefined}/>
            <Fill/>
            {
              flow_context?.editable ?
              <DeleteIcon size={24} onClick={() => {
                props.setModel(model => {
                  let new_props = {...model.properties};
                  delete new_props[prop_name];
                  return {...model, properties: new_props, visibleProperties: model.visibleProperties?.filter(vis_prop => vis_prop in new_props)};
                })
              }}/>
              : null
            }
          </div>
        })
      }
    </div>
    }
  </>
}