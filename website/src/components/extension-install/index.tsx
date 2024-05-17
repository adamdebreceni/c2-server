import * as React from "react";
import { useState } from "react"
import { NotificationContext } from "website/src/common/notification-context";
import "./index.scss"

export function InstallExtensionModal(props: {onInstall: (extensions: AssetInfo[])=>Promise<void>}) {
  const [success, setSuccess] = useState(false);
  const [extensions, setExtensions] = useState<AssetInfo[]>([]);
  const addExtension = React.useCallback((e: React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0];
    if (!file) return;
    console.log(file);
    const data = new FormData();
    data.append('file', file);
    fetch(`/api/file/${encodeURIComponent(file!.name)}`, {method: "POST", body: data}).then((resp)=>{
      console.log(`File upload response:`, resp);
      setExtensions(curr => [...curr, {name: file!.name, url: `/api/file/${encodeURIComponent(file!.name)}`}]);
    });
  }, [])
  return <div className="install-extension">
    <div className="title">Install assets</div>
    <div className="extension-list-container">
      <div className="extension-list">{
        extensions.map(ext => <div key={ext.name} className="extension">{ext.name}</div>)
      }
      </div>
      <label className="add-extension">
        <svg xmlns="http://www.w3.org/2000/svg" height="36px" viewBox="0 0 24 24" width="36px"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        <input type="file" onChange={addExtension} style={{display: 'none'}}/>
      </label>
    </div>
    <div className="footer">
      {!success ?
        <div className={`install ${extensions.length === 0 ? 'inactive' : ''}`} onClick={()=>{
          if (extensions.length === 0) return;
          props.onInstall(extensions).then(()=>{
            setSuccess(true);
          });
        }}>Install</div>
      : <div className="success">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
        </div>}
    </div>
  </div>
}