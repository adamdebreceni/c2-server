import * as React from "react";
import { useState, useContext } from "react";
import { ServiceContext } from "../../common/service-context";
import { Loader } from "../loader";
import "./index.scss";
import { Dropdown } from "../dropdown";
import { ModalContext } from "../../common/modal-context";

export function ImportModal(props: {onImport: (class_str: string, flow_str: string)=>void}) {
  const services = useContext(ServiceContext);
  const openModal = useContext(ModalContext);
  const [classes, setClasses] = useState<string[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  React.useEffect(() => {
    let isMounted = true;
    
    async function fetchClasses() {
      try {
        const agent_class_likes = await services?.agents.fetchClasses();
        if (isMounted && agent_class_likes) {
          setClasses(st => agent_class_likes.map(agent_class_like => agent_class_like.name));
        }
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      }
    }
    
    fetchClasses();
    
    return () => {
      isMounted = false;
    };
  }, [services]);
  
  return (
    <div className="import-modal">
      <div className="header">Import Flow</div>
      <div className="agent-list">
        <div className="agent-list-inner">
        {classes === null ? (
          <Loader />
        ) : (
          <div className="import-controls">
            {/* File Upload */}
            <label className="file-upload">
              <input type="file" accept=".json" onChange={handleFileChange} />
              <span>{selectedFile ? selectedFile.name : "Select File"}</span>
            </label>
            
            <Dropdown name="Class" items={classes} onChange={(item) => {
              setSelectedClass(item);
            }} />
          </div>
        )}
        </div>
      </div>
      <div className="footer">
        <div className="cancel" onClick={()=>openModal(null as any)}>
        CANCEL
        </div>
        <div className="import" onClick={
          () => {
            if (selectedFile && selectedClass) {
              const reader = new FileReader();
              reader.onload = (e) => {
                props.onImport(selectedClass, e.target?.result as string);
              };
              reader.readAsText(selectedFile);
            }
          }}>
          <span className="label">IMPORT</span>
          <div className="import-loader" />
        </div>
      </div>
    </div>
    );
  }
  