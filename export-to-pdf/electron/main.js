import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let viteServer;

const isDev = !app.isPackaged;

// Paths
const getResourcePath = () => {
    if (isDev) {
        return path.join(__dirname, '..');
    }
    return process.resourcesPath;
};

const getSourcePath = () => {
    return path.join(getResourcePath(), 'public');
};

const getResumeTemplatePath = () => {
    return path.join(getResourcePath(), '..', 'resume-template.md');
};

const getResumePath = () => {
    return path.join(getSourcePath(), 'resume.md');
};

// Create application menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Resume from Template',
                    accelerator: 'CmdOrCtrl+N',
                    click: async () => {
                        const result = await dialog.showMessageBox(mainWindow, {
                            type: 'warning',
                            title: 'Create New Resume',
                            message: 'This will replace your current resume with a new template. Are you sure?',
                            buttons: ['Cancel', 'Create New'],
                            defaultId: 0,
                            cancelId: 0
                        });

                        if (result.response === 1) {
                            await createResumeFromTemplate();
                        }
                    }
                },
                {
                    label: 'Import Resume...',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        await importResume();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Open Resume File',
                    accelerator: 'CmdOrCtrl+E',
                    click: async () => {
                        const resumePath = getResumePath();
                        const { shell } = await import('electron');
                        await shell.openPath(resumePath);
                    }
                },
                {
                    label: 'Show Resume in Folder',
                    click: async () => {
                        const resumePath = getResumePath();
                        const { shell } = await import('electron');
                        shell.showItemInFolder(resumePath);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { type: 'separator' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Resume PDF Exporter',
                    click: async () => {
                        await dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Resume PDF Exporter',
                            message: 'Resume PDF Exporter v1.0.0',
                            detail: 'A desktop application for creating professional resumes with live preview and PDF export.\n\nBuilt with Electron, React, and Vite.'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Helper function to create resume from template
async function createResumeFromTemplate() {
    const resumePath = getResumePath();
    const templatePath = getResumeTemplatePath();
    
    try {
        if (fs.existsSync(templatePath)) {
            fs.copyFileSync(templatePath, resumePath);
        } else {
            const basicTemplate = `# Your Name\n\n## Professional Summary\n\n[Write your summary here]\n\n## Experience\n\n### Job Title, Company <span class="spacer"></span> Month Year — Present\n\n- [Your accomplishments]\n\n## Skills\n\n**Programming Languages:** Your skills here\n`;
            fs.writeFileSync(resumePath, basicTemplate);
        }
        
        await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Template Created',
            message: 'New resume created from template!'
        });
        
        if (mainWindow) {
            mainWindow.reload();
        }
    } catch (error) {
        await dialog.showErrorBox('Error', `Failed to create template: ${error.message}`);
    }
}

// Helper function to import resume
async function importResume() {
    const fileResult = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Resume File',
        filters: [{ name: 'Markdown', extensions: ['md'] }],
        properties: ['openFile']
    });

    if (!fileResult.canceled && fileResult.filePaths.length > 0) {
        try {
            const resumePath = getResumePath();
            fs.copyFileSync(fileResult.filePaths[0], resumePath);
            
            await dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'File Imported',
                message: 'Resume imported successfully!'
            });
            
            if (mainWindow) {
                setTimeout(() => {
                    mainWindow.reload();
                }, 500);
            }
        } catch (error) {
            await dialog.showErrorBox('Error', `Failed to import file: ${error.message}`);
        }
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.png'),
        title: 'Resume PDF Exporter'
    });

    // Create application menu
    createMenu();

    if (isDev) {
        // Development mode - connect to Vite dev server
        mainWindow.loadURL('http://localhost:3000');
        // Uncomment to open DevTools automatically:
        // mainWindow.webContents.openDevTools();
    } else {
        // Production mode - load built files
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
}

// Check if resume.md exists, if not, prompt user
async function checkResumeFile() {
    const resumePath = getResumePath();
    const templatePath = getResumeTemplatePath();
    
    // Ensure public directory exists
    const publicDir = path.dirname(resumePath);
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }
    
    if (!fs.existsSync(resumePath)) {
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'Welcome to Resume PDF Exporter',
            message: 'No resume.md file found. Would you like to create one from the template?',
            buttons: ['Create from Template', 'Import Existing File', 'Create Blank'],
            defaultId: 0
        });

        let fileCreated = false;

        if (result.response === 0) {
            // Create from template
            if (fs.existsSync(templatePath)) {
                fs.copyFileSync(templatePath, resumePath);
                fileCreated = true;
                await dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Template Created',
                    message: `Resume template created at:\n${resumePath}\n\nEdit this file to create your resume.`
                });
            } else {
                // Template doesn't exist, create a basic one
                const basicTemplate = `# Your Name\n\n## Professional Summary\n\n[Write your summary here]\n\n## Experience\n\n### Job Title, Company <span class="spacer"></span> Month Year — Present\n\n- [Your accomplishments]\n\n## Skills\n\n**Programming Languages:** Your skills here\n`;
                fs.writeFileSync(resumePath, basicTemplate);
                fileCreated = true;
                await dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Blank Resume Created',
                    message: `Blank resume created at:\n${resumePath}\n\nEdit this file to create your resume.`
                });
            }
        } else if (result.response === 1) {
            // Import existing file
            const fileResult = await dialog.showOpenDialog(mainWindow, {
                title: 'Select Resume File',
                filters: [{ name: 'Markdown', extensions: ['md'] }],
                properties: ['openFile']
            });

            if (!fileResult.canceled && fileResult.filePaths.length > 0) {
                fs.copyFileSync(fileResult.filePaths[0], resumePath);
                fileCreated = true;
                await dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'File Imported',
                    message: `Resume imported successfully!\n\nThe app will now reload.`
                });
            }
        } else {
            // Create blank
            const blankResume = `# Your Name\n\n## Professional Summary\n\n## Experience\n\n## Skills\n`;
            fs.writeFileSync(resumePath, blankResume);
            fileCreated = true;
        }

        // Reload the window to show the new resume
        if (fileCreated && mainWindow) {
            // Small delay to ensure file is written
            setTimeout(() => {
                mainWindow.reload();
            }, 500);
        }
    }
}

// IPC handlers
ipcMain.handle('select-export-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (result.canceled) {
        return null;
    }

    return result.filePaths[0];
});

ipcMain.handle('open-resume-file', async () => {
    const resumePath = getResumePath();
    const { shell } = await import('electron');
    const result = await shell.openPath(resumePath);
    
    // If openPath fails, show error dialog
    if (result) {
        dialog.showErrorBox('Error Opening File', `Could not open resume.md: ${result}`);
        return false;
    }
    return true;
});

ipcMain.handle('get-resume-path', () => {
    return getResumePath();
});

ipcMain.handle('read-resume', async () => {
    const resumePath = getResumePath();
    try {
        if (fs.existsSync(resumePath)) {
            const content = fs.readFileSync(resumePath, 'utf-8');
            return { success: true, content };
        }
        return { success: false, error: 'Resume file not found' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('watch-resume', (event) => {
    const resumePath = getResumePath();
    let watcher = null;
    
    try {
        // Watch for file changes
        watcher = fs.watch(resumePath, (eventType) => {
            if (eventType === 'change') {
                // Send update to renderer
                event.sender.send('resume-updated');
            }
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// App lifecycle
app.whenReady().then(async () => {
    createWindow();
    
    // Check for resume file after window is created
    setTimeout(() => {
        checkResumeFile();
    }, 1000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle Vite server process cleanup
app.on('quit', () => {
    if (viteServer) {
        viteServer.kill();
    }
});
