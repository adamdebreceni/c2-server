import * as React from "react";
import { ModalContext } from "../../common/modal-context";
import { NotificationContext } from "../../common/notification-context";
import { ServiceContext } from "../../common/service-context";
import { ConfigureModal } from "../configure";
import { InstallExtensionModal } from "../extension-install";
import "./index.scss"

export function AgentMenu(props: {id: string}) {
  const notif = React.useContext(NotificationContext)
  const services = React.useContext(ServiceContext);
  const openModal = React.useContext(ModalContext);
  const openInstallExtension = React.useCallback((e: React.MouseEvent)=>{
    openModal(<InstallExtensionModal onInstall={async (extensions) => {
      await services!.agents.installExtensions(props.id, extensions);
      notif.emit(`Installed ${extensions.length} assets on "${props.id}"`, "success");
    }}/>);
    (e.currentTarget!.parentElement!.parentElement as any).blur();
  }, [props.id])
  const openPropChange = React.useCallback((e: React.MouseEvent)=>{
    openModal(<ConfigureModal onSubmit={async (properties) => {
      try {
        await services!.agents.configure(props.id, properties);
        notif.emit(`Configured agent "${props.id}"`, "success");
      } catch {
        notif.emit(`Failed to configure agent "${props.id}"`, "error");
      }
    }}/>);
    (e.currentTarget!.parentElement!.parentElement as any).blur();
  }, [props.id])
  const restart = React.useCallback((e: React.MouseEvent)=>{
    (e.currentTarget!.parentElement!.parentElement as any).blur();
    services!.agents.restart(props.id).then(()=>{
      notif.emit(`Agent "${props.id}" restarted`, "success");
    });
  }, [props.id]);
  const dump_debug = React.useCallback((e: React.MouseEvent)=>{
    services!.agents.dumpDebugInfo(props.id).then(({file}: {file: string})=>{
      notif.emit(`Agent "${props.id}" debug info dumped`, "success");
      services!.files.fetch(file);
    }).catch(()=>{
      notif.emit(`Failed to dump debug info for agent "${props.id}"`, "error");
    })
  }, [props.id])
  return <div className="agent-menu popout">
      <div className="menu-item" onClick={openPropChange}>Configure</div>
      <div className="menu-item" onClick={openInstallExtension}>Install assets</div>
      <div className="menu-item" onClick={restart}>Restart</div>
      <div className="menu-item disabled">Stop</div>
      <div className="menu-item" onClick={dump_debug}>Dump debug info</div>
    </div>
}