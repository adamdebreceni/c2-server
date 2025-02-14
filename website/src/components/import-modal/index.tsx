import * as React from "react";
import { useState, useContext } from "react";
import { ServiceContext } from "../../common/service-context";
import { Loader } from "../loader";
import "./index.scss";

export function ImportModal(props: {
    state: ImportState,
    setImportState: (fn: (curr: ImportState) => ImportState) => void,
    onCancel: () => void,
    onImport: (class_str: string, flow_str: string)=>void
}) {
    const services = useContext(ServiceContext);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedClass, setSelectedClass] = React.useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
    };

    const handleClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedClass(event.target.value);
    };

    return (
        <div className="import-modal">
            <div className="header">Import Flow</div>
            <div className="agent-list">
                <div className="agent-list-inner">
                    {props.state === null ? (
                        <Loader />
                    ) : (
                        <div className="import-controls">
                            {/* File Upload */}
                            <label className="file-upload">
                                <input type="file" accept=".json" onChange={handleFileChange} />
                                <span>{selectedFile ? selectedFile.name : "Select File"}</span>
                            </label>

                            {/* Dropdown with Dynamic Classes */}
                            <div className="dropdown">
                                <select defaultValue="" onChange={handleClassChange}>
                                    <option value="" disabled>
                                        Select a class
                                    </option>
                                    {props.state.classes.map((cls, index) => (
                                        <option key={index} value={cls}>
                                            {cls}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="footer">
                <div className="cancel" onClick={props.onCancel}>
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
