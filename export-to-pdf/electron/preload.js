const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    selectExportDirectory: () => ipcRenderer.invoke('select-export-directory'),
    openResumeFile: () => ipcRenderer.invoke('open-resume-file'),
    getResumePath: () => ipcRenderer.invoke('get-resume-path'),
    readResume: () => ipcRenderer.invoke('read-resume'),
    readCSS: () => ipcRenderer.invoke('read-css'),
    watchResume: () => ipcRenderer.invoke('watch-resume'),
    onResumeUpdated: (callback) => ipcRenderer.on('resume-updated', callback),
    exportPDF: () => ipcRenderer.invoke('export-pdf'),
    createFromTemplate: () => ipcRenderer.invoke('create-from-template'),
    importResume: () => ipcRenderer.invoke('import-resume'),
    createBlank: () => ipcRenderer.invoke('create-blank'),
    resetToWelcome: () => ipcRenderer.invoke('reset-to-welcome'),
    isElectron: true
});

// Expose Bullet Library API
contextBridge.exposeInMainWorld('bulletLibrary', {
    // Bullet operations
    addBullet: (bulletData) => ipcRenderer.invoke('bullet:add', bulletData),
    getBullet: (id) => ipcRenderer.invoke('bullet:get', id),
    getAllBullets: () => ipcRenderer.invoke('bullet:getAll'),
    deleteBullet: (id) => ipcRenderer.invoke('bullet:delete', id),
    addBulletVariant: (bulletId, variantText) => ipcRenderer.invoke('bullet:addVariant', bulletId, variantText),
    acceptVariant: (bulletId, variantId) => ipcRenderer.invoke('bullet:acceptVariant', bulletId, variantId),
    rejectVariant: (bulletId, variantId) => ipcRenderer.invoke('bullet:rejectVariant', bulletId, variantId),

    // Header operations
    addHeader: (headerData) => ipcRenderer.invoke('header:add', headerData),
    getHeader: (id) => ipcRenderer.invoke('header:get', id),
    getAllHeaders: () => ipcRenderer.invoke('header:getAll'),
    deleteHeader: (id) => ipcRenderer.invoke('header:delete', id),
    getSubHeaders: (parentId) => ipcRenderer.invoke('header:getSubHeaders', parentId),
    generateHeaderMarkdown: (id) => ipcRenderer.invoke('header:generateMarkdown', id),

    // Job post operations
    saveJobPost: (markdown) => ipcRenderer.invoke('jobPost:save', markdown),
    getJobPost: (filename) => ipcRenderer.invoke('jobPost:get', filename),
    listJobPosts: () => ipcRenderer.invoke('jobPost:list'),
    deleteJobPost: (filename) => ipcRenderer.invoke('jobPost:delete', filename),
    extractJobContext: (filename) => ipcRenderer.invoke('jobPost:extractContext', filename)
});
