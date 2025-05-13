import * as React from "react";
import { createContext } from "react";

export const ThemeContext = createContext<{current: 'dark'|'light', toggle: ()=>void}>({current: 'light', toggle: ()=>{}});