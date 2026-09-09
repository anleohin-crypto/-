import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopApi', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  openDataFolder: () => ipcRenderer.invoke('app:open-data-folder'),
});
