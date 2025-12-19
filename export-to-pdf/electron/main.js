import { app, BrowserWindow, dialog, ipcMain } from 'electron';
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

    // Remove default menu
    mainWindow.setMenu(null);

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
    
    if (!fs.existsSync(resumePath)) {
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'Welcome to Resume PDF Exporter',
            message: 'No resume.md file found. Would you like to create one from the template?',
            buttons: ['Create from Template', 'Import Existing File', 'Create Blank'],
            defaultId: 0
        });

        if (result.response === 0) {
            // Create from template
            if (fs.existsSync(templatePath)) {
                fs.copyFileSync(templatePath, resumePath);
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Template Created',
                    message: `Resume template created at:\n${resumePath}\n\nEdit this file to create your resume.`
                });
            } else {
                // Template doesn't exist, create a basic one
                const basicTemplate = `# Your Name\n\n## Professional Summary\n\n[Write your summary here]\n\n## Experience\n\n### Job Title, Company <span class="spacer"></span> Month Year — Present\n\n- [Your accomplishments]\n\n## Skills\n\n**Programming Languages:** Your skills here\n`;
                fs.writeFileSync(resumePath, basicTemplate);
                dialog.showMessageBox(mainWindow, {
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
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'File Imported',
                    message: `Resume imported successfully!`
                });
            }
        } else {
            // Create blank
            const blankResume = `# Your Name\n\n## Professional Summary\n\n## Experience\n\n## Skills\n`;
            fs.writeFileSync(resumePath, blankResume);
        }

        // Reload the window to show the new resume
        if (mainWindow) {
            mainWindow.reload();
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
