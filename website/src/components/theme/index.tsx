import * as React from 'react';
import { useState } from "react";
import { ThemeContext } from "../../../src/common/theme-context";

export function Theme(props: {children: React.ReactNode[]|React.ReactNode}) {
  const [state, setState] = useState<'dark'|'light'>(() => localStorage.getItem('theme') as any ?? 'light');
  React.useEffect(()=>{
    document.getElementById('root')?.classList.add(`theme-${state}`);
    localStorage.setItem('theme', state);
    return () => {
      document.getElementById('root')?.classList.remove(`theme-${state}`);
    }
  }, [state]);
  return <ThemeContext.Provider value={{current: state, toggle: () => setState(st => st === 'light' ? 'dark' : 'light')}}>
    {props.children}
  </ThemeContext.Provider>
}