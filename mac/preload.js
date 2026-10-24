const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('geulbang', {
  load: () => ipcRenderer.invoke('store:load'),
  save: data => ipcRenderer.invoke('store:save', data),
  saveSync: data => ipcRenderer.sendSync('store:saveSync', data),
  onChanged: fn => ipcRenderer.on('store:changed', () => fn()),

  pickPhotos: () => ipcRenderer.invoke('photo:pick'),
  importPhotos: files => ipcRenderer.invoke('photo:import', [...files].map(f => webUtils.getPathForFile(f))),

  syncStatus: () => ipcRenderer.invoke('sync:status'),
  setSyncEnabled: on => ipcRenderer.invoke('sync:setEnabled', on),
  syncNow: () => ipcRenderer.invoke('sync:now'),
  revealSyncFolder: () => ipcRenderer.invoke('sync:reveal'),
  onSyncStatus: fn => ipcRenderer.on('sync:status', (_e, s) => fn(s)),

  saveFile: (name, text) => ipcRenderer.invoke('file:save', name, text),
  exportBackup: data => ipcRenderer.invoke('backup:export', data),
  openBackup: () => ipcRenderer.invoke('backup:open'),
  exportPDF: name => ipcRenderer.invoke('file:pdf', name),
  onMenu: fn => ipcRenderer.on('menu', (_e, cmd) => fn(cmd)),
});
