import * as React from "react";
import { useState, useContext } from "react";
import { ServiceContext } from "../../common/service-context";
import { Loader } from "../loader";
import "../import-modal/index.scss";
import "./index.scss"
import "../component-editor-input/index.scss";
import { Dropdown } from "../dropdown";
import { ModalContext } from "../../common/modal-context";
import { CloudUploadIcon } from "../../../src/icons/cloud-upload";
import { CloseIcon } from "../../../src/icons/close";
import { Fill } from "../fill/Fill";
import { NotificationContext } from "../../../src/common/notification-context";

function parsePath(text: string): {text: string, error: string|null, value: string[]|null} {
  const path = text.split('/');
  if (path.length === 1 || path[0] !== '' || path.slice(1, path.length - 1).some(segment => segment === '') || path.slice(1, path.length).some(segment => segment === '.' || segment === '..')) {
    return {text, error: "Invalid path", value: null};
  }
  return {text, error: null, value: path.slice(1)};
}

function parseFilename(text: string): {text: string, error: string|null, value: string|null} {
  if (text === '') {
    return {text, error: null, value: null};
  }
  if (text.includes('/') || text === '.' || text === '..') {
    return {text, error: "Invalid filename", value: null};
  }
  return {text, error: null, value: text};
}

export function UploadModal(props: {directory: string[], onUploadDone: (id: string, path: string[], size: number)=>void}) {
  const services = useContext(ServiceContext);
  const openModal = useContext(ModalContext);
  const notif = useContext(NotificationContext);
  const [state, setState] = useState<{job: {abort: ()=>void, onProgress: (cb: (progress: number)=>void)=>void, progress: number}|null, file: File|null, path: {text: string, error: string|null, value: string[]|null}, filename: {text: string, error: string|null, value: string|null}}>(() => {
    return {job: null, file: null, path: parsePath('/' + props.directory.join('/')), filename: {text: '', error: null, value: null}};
  });
  
  const handleFileChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setState(st => {
      return {...st, file};
    });
  }, [setState]);

  const handlePathChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    setState(st => {
      return {...st, path: parsePath(value)};
    })
  }, [setState]);

  const handleFilenameChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value;
    setState(st => {
      return {...st, filename: parseFilename(value)};
    })
  }, [setState]);

  React.useEffect(() => {
    if (!state.job) {
      return;
    }
    let mounted = true;
    state.job.onProgress(progress => {
      if (!mounted) {
        return;
      }
      setState(st => {
        if (st.job?.onProgress !== state.job!.onProgress) {
          return st;
        }
        return {...st, job: {...st.job, progress}};
      })
    })
    return () => {
      mounted = false;
      state.job?.abort();
    }
  }, [state.job?.onProgress]);
  
  return <div className="import-modal">
    <div className="header">
      Upload Asset
      <Fill />
      <CloseIcon size={20} onClick={()=>openModal(null as any)} />
    </div>
    <div className="import-controls">
      <label className={`file-upload ${state.file ? 'selected' : ''}`}>
        <input type="file" onChange={handleFileChange} disabled={!!state.job} />
        <CloudUploadIcon size={50} className="" />
        <span>{state.file ? `File selected: ${state.file.name}` : "Select a File"}</span>
      </label>
      
      
      <label className="input-field">
        <div style={{display: "flex", alignItems: "center", paddingBottom: `5px`}}>
          <span className="input-label">Directory</span>
        </div>
        <div className="inner">
          <input className={state.path.error !== null ? "error" : ''} value={state.path.text} onChange={handlePathChange} readOnly={!!state.job} />
          {state.path.error ?
            <div className="input-error">{state.path.error}</div>
            : null
          }
        </div>
      </label>
      <label className="input-field mt-4">
        <div style={{display: "flex", alignItems: "center", paddingBottom: `5px`}}>
          <span className="input-label">Filename</span>
        </div>
        <div className="inner">
          <input className={state.filename.error !== null ? "error" : ''} placeholder={state.file?.name} value={state.filename.text} onChange={handleFilenameChange} readOnly={!!state.job} />
          {state.path.error ?
            <div className="input-error">{state.filename.error}</div>
            : null
          }
        </div>
      </label>
    </div>
    <div className="footer">
      <div className="cancel" onClick={()=>openModal(null as any)}>
      Cancel
      </div>
      <div className={`import ${!state.file || !state.path.value || state.job ? 'inactive' : ''}`} onClick={
        () => {
            setState(st => {
              if (!st.file || !st.path.value) {
                return st;
              }
              if (st.job) {
                // notif.emit('There is already an upload in progess', 'error');
                return st;
              }
              const job = services!.files.upload(st.file);
              job.result.then(id => {
                const dirpath = st.path.value![st.path.value!.length - 1] === '' ? st.path.value!.slice(0, st.path.value!.length - 1) : st.path.value!;
                const fullpath = [...dirpath, st.filename.value ?? st.file!.name];
                notif.emit(`Successfully uploaded file /${fullpath.join('/')}`, 'success');
                props.onUploadDone(id, fullpath, st.file!.size);
              }).catch(()=>{});
              return {...st, job: {...job, progress: 0}};
            })
        }}>
        <span className="label" style={{opacity: state.job ? 0 : 1}}>Upload</span>
        <div className="loader" style={{display: state.job ? 'initial' : 'none'}}/>
      </div>
    </div>
    <div className="progress-indicator" style={{width: `${100 * (state.job?.progress ?? 0)}%`}}></div>
  </div>;
}
