import { contextBridge, ipcRenderer } from "electron";
const IPC = {
  getConfig: "cp:getConfig",
  saveConfig: "cp:saveConfig",
  setEnabled: "cp:setEnabled",
  execute: "cp:execute",
  setArmed: "cp:setArmed",
  getRuntime: "cp:getRuntime",
  checkPermissions: "cp:checkPermissions",
  openAccessibilitySettings: "cp:openAccessibilitySettings",
  pickPath: "cp:pickPath",
  // main -> renderer push channels (events, not invoke)
  controllerState: "cp:controllerState",
  runtimeStatus: "cp:runtimeStatus"
};
const bridge = {
  // Exposed synchronously so the renderer can branch on OS without a round-trip.
  platform: process.platform,
  getConfig: () => ipcRenderer.invoke(IPC.getConfig),
  saveConfig: (config) => ipcRenderer.invoke(IPC.saveConfig, config),
  setEnabled: (enabled) => ipcRenderer.invoke(IPC.setEnabled, enabled),
  execute: (intents) => ipcRenderer.invoke(IPC.execute, intents),
  setArmed: (armed) => ipcRenderer.invoke(IPC.setArmed, armed),
  getRuntime: () => ipcRenderer.invoke(IPC.getRuntime),
  onControllerState: (cb) => {
    const listener = (_e, state) => cb(state);
    ipcRenderer.on(IPC.controllerState, listener);
    return () => ipcRenderer.removeListener(IPC.controllerState, listener);
  },
  onRuntimeStatus: (cb) => {
    const listener = (_e, status) => cb(status);
    ipcRenderer.on(IPC.runtimeStatus, listener);
    return () => ipcRenderer.removeListener(IPC.runtimeStatus, listener);
  },
  checkPermissions: () => ipcRenderer.invoke(IPC.checkPermissions),
  openAccessibilitySettings: () => ipcRenderer.invoke(IPC.openAccessibilitySettings),
  pickPath: (kind) => ipcRenderer.invoke(IPC.pickPath, kind)
};
contextBridge.exposeInMainWorld("claudepad", bridge);
