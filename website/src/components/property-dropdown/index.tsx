import * as React from "react";
import { InputField } from "../component-editor-input";
import { Dropdown } from "../dropdown";

export function PropertyDropdown(props: {name: string, items: string[], initial?: string|null, onChange?: (item: string)=>void, width?: string, visible?: boolean, onChangeVisibility?: (name: string)=>void, error?: string}) {
  return <Dropdown {...props} />
}