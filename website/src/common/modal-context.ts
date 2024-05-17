import * as React from "react";
import { createContext } from "react";

export const ModalContext = createContext<(modal: React.ReactElement)=>void>(()=>{});