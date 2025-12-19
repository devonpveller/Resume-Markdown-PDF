const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    selectExportDirectory: () => ipcRenderer.invoke('select-export-directory'),
    openResumeFile: () => ipcRenderer.invoke('open-resume-file'),
    getResumePath: () => ipcRenderer.invoke('get-resume-path'),
    isElectron: true
});
