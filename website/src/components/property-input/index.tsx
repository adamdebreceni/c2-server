import * as React from "react";
import { InputField } from "../component-editor-input";

export function PropertyField(props: {name: string, width?: string, default?: string|null, labelPaddingBottom?: number, onChange?: (value: string)=>void, visible?: boolean, onChangeVisibility?: (name: string)=>void}) {
  return <InputField {...props} />
}