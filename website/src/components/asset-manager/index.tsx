import * as React from "react";

import "./index.scss";
import { ArrowRightIcon } from "../../../src/icons/arrow-right";
import { CloudUploadIcon } from "../../../src/icons/cloud-upload";
import { ArrowFullDownIcon } from "../../../src/icons/arrow-full-down";
import * as uuid from 'uuid';
import { ModalContext } from "../../../src/common/modal-context";
import { ConfirmModal } from "../confirm-modal";
import { UploadModal } from "../upload-modal";
import { useNavigate } from "react-router";
import { Fill } from "../fill/Fill";
import { NotificationContext } from "../../../src/common/notification-context";

type AssetMenuData = {pos: {x: number, y: number}, items: {name: string, on: ()=>void}[]};
type OpenMenuCb = (x: number, y: number, items: {name: string, on: ()=>void}[]|null) => void;
type SetAssetsCb = (fn: (assets: FlowAssetDirectory['entries'])=>FlowAssetDirectory['entries'])=>void;

export function AssetManager(props: {assets?: FlowAssetDirectory['entries'], setAssets: SetAssetsCb|null}) {
  const [menu, setMenu] = React.useState<AssetMenuData|null>(null);
  const openModal = React.useContext(ModalContext);
  const [state, setState] = React.useState<boolean>(false);
  const [new_folder, setNewFolder] = React.useState<boolean>(false);
  const view_ref = React.useRef<HTMLDivElement>(null);

  const closeMenu = React.useCallback(() => {
    setMenu(null);
  }, [setMenu]);

  const openMenu = React.useCallback((x: number, y: number, items: {name: string, on: ()=>void}[]|null) => {
    if (!items) {
      setMenu(null);
    } else {
      setMenu({
        pos: {x: x - view_ref.current!.getBoundingClientRect().left + 20, y: y - view_ref.current!.getBoundingClientRect().top + 20},
        items: items
      });
    }
  }, [setMenu]);
  
  return <div ref={view_ref} className={`popout flow-assets ${state ? 'active' : ''}`}>
    <div className="flow-assets-header" onContextMenu={props.setAssets && state ? ((e: React.MouseEvent) => {
      e.preventDefault();
      openMenu(e.clientX , e.clientY, [
        {name: 'New Folder...', on: ()=>{
          setNewFolder(true);
          setMenu(null);
        }},
        {name: 'Upload File...', on: ()=>{
          openModal(<UploadModal directory={[]} onUploadDone={(id, path, size) => {
            addNewAsset(props.setAssets!, id, path, size);
            openModal(null as any);
          }} />)
          setMenu(null);
        }},
      ]);
    }) : undefined} onClick={() => setState(st => !st)}><ArrowRightIcon size={14} />Assets<Fill /><AssetSize value={props.assets ?? []}/></div>
    <div className="entries">
      {new_folder ? <NewAssetDirectory parent={null} depth={1} cancel={() => setNewFolder(false)} setAssets={props.setAssets!}/> : null}
      {props.assets?.sort(AssetComparator).map(entry => {
        return <FlowAssetEntryView key={entry.id} path={[]} value={entry} openMenu={openMenu} setAssets={props.setAssets} depth={1}/>
      })}
    </div>
    {
      menu ? 
        <div className="menu-container" style={{left: `${menu.pos.x}px`, top: `${menu.pos.y}px`}}>
          <AssetMenu items={menu.items} close={closeMenu} />
        </div> : null
    }
  </div>;
}

function FlowAssetEntryView(props: {path: string[], value: FlowAssetDirectory['entries'][0], openMenu: OpenMenuCb, setAssets: SetAssetsCb|null, depth: number}) {
  if ('entries' in props.value) {
    return <FlowAssetDirectoryView value={props.value} path={props.path} openMenu={props.openMenu} setAssets={props.setAssets} depth={props.depth}/>
  }
  return <FlowAssetView value={props.value} openMenu={props.openMenu} setAssets={props.setAssets} depth={props.depth}/>;
}

function FlowAssetView(props: {value: FlowAsset, openMenu: OpenMenuCb, setAssets: SetAssetsCb|null, depth: number}) {
  const openModal = React.useContext(ModalContext);
  const notif = React.useContext(NotificationContext);
  const [renaming, setRenaming] = React.useState<boolean>(false);
  return <div className={`flow-asset`}>
    {renaming ? <RenameAsset id={props.value.id} initial={props.value.name} depth={props.depth} type="file" setAssets={props.setAssets!} cancel={()=>setRenaming(false)} /> :
    <div className="header" onContextMenu={props.setAssets ? ((e: React.MouseEvent) => {
      e.preventDefault();
      props.openMenu(e.clientX, e.clientY, [
        {name: 'Rename...', on: ()=>{
          setRenaming(true);
          props.openMenu(0, 0, null);
        }},
        {name: 'Copy Reference', on: ()=>{
          navigator.clipboard.writeText(`@{asset-id:${props.value.id}}`).then(()=>{
            notif.emit("Copied asset reference to clipboard", "success");
          }).catch(()=>{
            notif.emit("Failed to copy asset id", "error");
          });
          props.openMenu(0, 0, null);
        }},
        {name: 'Delete', on: ()=>{
          props.openMenu(0, 0, null);
          openModal(<ConfirmModal text={`Are you sure you want to delete asset '${props.value.name}'?`} confirmLabel="Delete" type="DELETE" onConfirm={()=>{
            props.setAssets!(assets => {
              const delete_entry: ((entry: FlowAssetDirectory['entries'][number]) => FlowAssetDirectory['entries'][number]) = (entry: FlowAssetDirectory['entries'][number]) => {
                if ('entries' in entry) {
                  return {...entry, entries: entry.entries.filter(asset => asset.id !== props.value.id).map(delete_entry)}
                }
                return entry;
              }
              return assets.filter(asset => asset.id !== props.value.id).map(delete_entry);
            })
          }}/>)
        }}
      ])
    }) : undefined}><Indentation size={props.depth}/><div className="name">{props.value.name}</div><Fill /><AssetSize value={props.value}/></div>}
  </div>
}

function AssetSize(props: {value: FlowAssetDirectory['entries'][number]|FlowAssetDirectory['entries']}) {
  const calc_entry_size: (entry: FlowAssetDirectory['entries'][number])=>number = (entry: FlowAssetDirectory['entries'][number]) => {
    if ('entries' in entry) {
      return entry.entries.map(calc_entry_size).reduce((prev, curr) => prev + curr, 0);
    }
    return entry.size;
  }
  let size = props.value instanceof Array ? props.value.map(calc_entry_size).reduce((prev, curr)=> prev + curr, 0) : calc_entry_size(props.value);
  if (size < 1000) {
    return <div className="asset-size">{size} B</div>
  }
  size /= 1000;
  if (size < 1000) {
    return <div className="asset-size">{size.toFixed(2)} KB</div>
  }
  size /= 1000;
  if (size < 1000) {
    return <div className="asset-size">{size.toFixed(2)} MB</div>
  }
  size /= 1000;
  return <div className="asset-size">{size.toFixed(2)} GB</div>
}

function addNewAsset(setAssets: SetAssetsCb, id: string, path: string[], size: number) {
  setAssets(assets => {
    const add_file: (entries: FlowAssetDirectory['entries'], path: string[])=>FlowAssetDirectory['entries'] = (entries: FlowAssetDirectory['entries'], path: string[]) => {
      if (path.length === 1) {
        return [...entries, {id: id as Uuid, name: path[0], hash: '', size}];
      }
      const dir_idx = entries.findIndex(entry => ('entries' in entry) && entry.name === path[0]);
      if (dir_idx !== -1) {
        return entries.map(entry => {
          if (!('entries' in entry) || entry.name !== path[0]) {
            return entry;
          }
          return {...entry, entries: add_file(entry.entries, path.slice(1))}
        })
      } else {
        return [...entries, {id: uuid.v4() as Uuid, name: path[0], entries: add_file([], path.slice(1))}];
      }
    };
    return add_file(assets, path);
  })
}

function FlowAssetDirectoryView(props: {path: string[], value: FlowAssetDirectory, openMenu: OpenMenuCb, setAssets: SetAssetsCb|null, depth: number}) {
  const openModal = React.useContext(ModalContext);
  const [new_folder, setNewFolder] = React.useState<boolean>(false);
  const [new_file, setNewFile] = React.useState<boolean>(false);
  const [renaming, setRenaming] = React.useState<boolean>(false);
  const [state, setState] = React.useState<boolean>(false);
  return <div className={`flow-asset-directory ${state ? 'active' : ''}`}>
    {renaming ? <RenameAsset id={props.value.id} initial={props.value.name} depth={props.depth} type="dir" setAssets={props.setAssets!} cancel={()=>setRenaming(false)} /> :
    <div className="header" onClick={() => setState(st => !st)} onContextMenu={props.setAssets ? ((e: React.MouseEvent) => {
      e.preventDefault();
      props.openMenu(e.clientX, e.clientY, [
        {name: 'New Folder...', on: ()=>{
          setNewFolder(true);
          setState(true);
          props.openMenu(0, 0, null);
        }},
        {name: 'Upload File...', on: ()=>{
          openModal(<UploadModal directory={[...props.path, props.value.name]} onUploadDone={(id, path, size) => {
            addNewAsset(props.setAssets!, id, path, size);
            openModal(null as any);
          }} />)
          props.openMenu(0, 0, null);
        }},
        {name: 'Rename...', on: ()=>{
          setRenaming(true);
          props.openMenu(0, 0, null);
        }},
        {name: 'Delete', on: ()=>{
          props.openMenu(0, 0, null);
          openModal(<ConfirmModal text={`Are you sure you want to delete directory '${props.value.name}' and all its assets?`} confirmLabel="Delete" type="DELETE" onConfirm={()=>{
            props.setAssets!(assets => {
              const delete_entry: ((entry: FlowAssetDirectory['entries'][number]) => FlowAssetDirectory['entries'][number]) = (entry: FlowAssetDirectory['entries'][number]) => {
                if ('entries' in entry) {
                  return {...entry, entries: entry.entries.filter(asset => asset.id !== props.value.id).map(delete_entry)}
                }
                return entry;
              }
              return assets.filter(asset => asset.id !== props.value.id).map(delete_entry);
            })
          }}/>)
        }}
      ])
    }) : undefined}><Indentation size={props.depth}/><ArrowRightIcon size={14} /><div className="name">{props.value.name}</div><Fill /><AssetSize value={props.value}/></div>}
    <div className="entries">
      {new_folder ? <NewAssetDirectory parent={props.value.id} depth={props.depth + 1} cancel={() => setNewFolder(false)} setAssets={props.setAssets!}/> : null}
      {new_file ? <NewAsset parent={props.value.id} depth={props.depth + 1} cancel={() => setNewFile(false)} setAssets={props.setAssets!}/> : null}
      {props.value.entries?.sort(AssetComparator).map(entry => {
        return <FlowAssetEntryView key={entry.id} path={[...props.path, props.value.name]} value={entry} openMenu={props.openMenu} setAssets={props.setAssets} depth={props.depth + 1}/>
      })}
    </div>
  </div>
}

export function AssetMenu(props: {items: {name: string, on: ()=>void}[], close: () => void}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const onBlur = React.useCallback(()=>{
    props.close();
  }, [props.close])
  React.useLayoutEffect(()=>{
    ref.current?.focus();
  }, [])
  return <div className="menu popout text-sm" ref={ref} tabIndex={-1} onBlur={onBlur}>
    {
      props.items.map(item => <AssetMenuItem key={item.name} name={item.name} on={item.on}/>)
    }
  </div>
}

function AssetMenuItem(props: {name: string, on: ()=>void}) {
  return <div className="menu-item" onClick={(e) => {e.stopPropagation(); props.on()}}>
    {props.name}
  </div>
}

function RenameAsset(props: {initial: string, type: 'dir'|'file', depth: number, setAssets: SetAssetsCb, cancel: ()=>void, id?: Uuid, parent?: Uuid|null}) {
  const [value, setValue] = React.useState<string>(props.initial);
  const ref = React.useRef<HTMLInputElement>(null);
  const onBlur = React.useCallback(()=>{
    props.cancel();
  }, [props.cancel])
  React.useLayoutEffect(()=>{
    ref.current?.focus();
  }, []);
  const handleKey = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.code === "Escape") {
      props.cancel();
    }
    if (e.code === "Enter") {
      props.setAssets(assets => {
        const new_entry: ()=>FlowAssetDirectory['entries'][number] = () => {
          return props.type === 'dir' ? {
            id: uuid.v4() as Uuid,
            name: ref.current!.value,
            entries: []
          } : {
            id: uuid.v4() as Uuid,
            name: ref.current!.value,
            size: 0,
            hash: '0'
          };
        }
        const update_entry: ((entry: FlowAssetDirectory['entries'][number]) => FlowAssetDirectory['entries'][number]) = (entry: FlowAssetDirectory['entries'][number]) => {
          if (entry.id === props.id) {
            return {...entry, name: ref.current!.value}
          }
          if (entry.id === props.parent) {
            return {...entry, entries: [...(entry as FlowAssetDirectory).entries, new_entry()]};
          }
          if ('entries' in entry) {
            return {...entry, entries: entry.entries.map(update_entry)}
          }
          return entry;
        }
        if (props.parent === null) {
          return [...assets, new_entry()]
        }
        return assets.map(update_entry);
      });
      props.cancel();
    }
  }, [props.cancel, props.setAssets]);
  return <div className="header"><Indentation size={props.depth}/>
    {props.type === 'dir' ? <ArrowRightIcon size={14} /> : null}
    <input value={value} ref={ref} onBlur={onBlur} onKeyDown={handleKey} onChange={e => setValue(e.currentTarget.value)}  />
  </div>
}

function NewAssetDirectory(props: {parent: Uuid|null, setAssets: SetAssetsCb, cancel: ()=>void, depth: number}) {
  return <div className="flow-asset-directory">
    <RenameAsset parent={props.parent} depth={props.depth} initial="" type="dir" setAssets={props.setAssets} cancel={props.cancel} />
  </div>
}

function NewAsset(props: {parent: Uuid|null,setAssets: SetAssetsCb, cancel: ()=>void, depth: number}) {
  return <div className="flow-asset">
    <RenameAsset parent={props.parent} depth={props.depth} initial="" type="file" setAssets={props.setAssets} cancel={props.cancel} />
  </div>
}

function Indentation(props: {size: number}) {
  return <div style={{width: `${props.size * 20}px`}}/>;
}

function AssetComparator(a: FlowAssetDirectory['entries'][number], b: FlowAssetDirectory['entries'][number]): number {
  if (('entries' in a) && !('entries' in b)) {
    return -1;
  }
  if (!('entries' in a) && ('entries' in b)) {
    return 1;
  }
  if (a.name < b.name) {
    return -1;
  }
  if (a.name === b.name) {
    return 0;
  }
  return 1;
}
