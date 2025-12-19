const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    selectExportDirectory: () => ipcRenderer.invoke('select-export-directory'),
    openResumeFile: () => ipcRenderer.invoke('open-resume-file'),
    getResumePath: () => ipcRenderer.invoke('get-resume-path'),
    readResume: () => ipcRenderer.invoke('read-resume'),
    watchResume: () => ipcRenderer.invoke('watch-resume'),
    onResumeUpdated: (callback) => ipcRenderer.on('resume-updated', callback),
    exportPDF: () => ipcRenderer.invoke('export-pdf'),
    createFromTemplate: () => ipcRenderer.invoke('create-from-template'),
    importResume: () => ipcRenderer.invoke('import-resume'),
    createBlank: () => ipcRenderer.invoke('create-blank'),
    resetToWelcome: () => ipcRenderer.invoke('reset-to-welcome'),
    isElectron: true
});
