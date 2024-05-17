import { useState } from "react";
import * as React from "react";
import { useLocation } from "react-router";
import { parseFilter } from "../../utils/filter-parser";
import * as qs from 'query-string';

import "./index.scss"

export class Filter{
  private fields = new Map<string, {value: string, reg: RegExp}>();
  constructor() {}

  set(key: string, value: string) {
    this.fields.set(key, {value: value, reg: new RegExp("^" + value + "$")});
  }

  match(item: {[x: string]: any}): boolean {
    for (const [field, val] of this.fields) {
      if (typeof item[field] === "string" && !val.reg.test(item[field])) {
        return false;
      }
    }
    return true;
  }

  static fromString(str: string): Filter|null {
    const map = parseFilter(str);
    if (!map) return null;
    const filter = new Filter();
    for (const [k, v] of map) {
      filter.set(k, v);
    }
    return filter;
  }

  toString(): string {
    const conditions: string[] = [];
    for (const [field, val] of this.fields) {
      conditions.push(`${field} = ${val.value}`);
    }
    return conditions.join(" and ");
  }
}

export function FilterWidget(props: {placeholder?: string, onFilterChange?: (filter: Filter)=>void, rollover?: number}) {
  const search = useLocation().search;
  const [filter, setFilter] = useState<Filter>(()=>{
    const loc = qs.parse(search);
    const filter = new Filter();
    for (const key in loc) {
      const val = loc[key];
      if (typeof val === "string") {
        filter.set(key, val);
      }
    }
    return filter;
  });
  React.useEffect(()=>{
    props.onFilterChange?.(filter);
  }, [props.onFilterChange, filter])
  const [newFilter, setNewFilter] = useState<Filter|null>(filter);
  React.useEffect(()=>{
    if (!newFilter) return;
    let mounted = true;
    setTimeout(()=>{
      if (!mounted) return;
      setFilter(newFilter);
    }, props.rollover ?? 1000);
    return ()=>{mounted = false;}
  }, [newFilter, props.rollover])
  const onChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>)=>{
    setNewFilter(Filter.fromString(e.currentTarget.value));
  }, [])
  return <input
      className={`filter ${newFilter ? "": "error"}`}
      placeholder={props.placeholder}
      defaultValue={filter.toString()} onChange={onChange}/>
}