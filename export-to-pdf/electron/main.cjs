const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

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
    if (isDev) {
        return path.join(__dirname, '..', 'public');
    }
    // In packaged app, use user data directory (writable)
    const userDataPath = path.join(app.getPath('userData'), 'resume-data');

    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
    }

    return userDataPath;
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
                        await shell.openPath(resumePath);
                    }
                },
                {
                    label: 'Show Resume in Folder',
                    click: async () => {
                        const resumePath = getResumePath();
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
                            detail: 'A desktop application for creating professional resumes with live preview and PDF export.\n\n' +
                                'Created by Devon Veller\n' +
                                'Copyright © 2025 Devon Veller\n\n' +
                                'This software is open source and free for non-commercial use only.\n' +
                                'You are free to use, modify, and distribute this software for non-commercial purposes, with attribution.\n' +
                                'Commercial use is strictly prohibited without permission.\n\n' +
                                'Built with Electron, React, and Vite.\n\n' +
                                'GitHub: github.com/devonveller/resume-pdf-exporter'
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
        const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
        console.log('Loading production file from:', indexPath);
        mainWindow.loadFile(indexPath);
    }

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`Console [${level}]:`, message);
    });
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

ipcMain.handle('create-from-template', async () => {
    await createResumeFromTemplate();
});

ipcMain.handle('import-resume', async () => {
    await importResume();
});

ipcMain.handle('create-blank', async () => {
    const resumePath = getResumePath();
    const blankResume = `# Your Name\n\n## Professional Summary\n\n## Experience\n\n## Skills\n`;
    fs.writeFileSync(resumePath, blankResume);

    if (mainWindow) {
        setTimeout(() => {
            mainWindow.reload();
        }, 500);
    }
});

ipcMain.handle('reset-to-welcome', async () => {
    const resumePath = getResumePath();
    if (fs.existsSync(resumePath)) {
        fs.unlinkSync(resumePath);
    }
    if (mainWindow) {
        mainWindow.reload();
    }
});

ipcMain.handle('read-resume', async () => {
    const resumePath = getResumePath();
    console.log('IPC: read-resume called, path:', resumePath);
    try {
        if (fs.existsSync(resumePath)) {
            const content = fs.readFileSync(resumePath, 'utf-8');
            console.log('IPC: Successfully read resume, length:', content.length);
            return { success: true, content };
        }
        console.log('IPC: Resume file not found');
        return { success: false, error: 'Resume file not found' };
    } catch (error) {
        console.error('IPC: Error reading resume:', error);
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

ipcMain.handle('export-pdf', async () => {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        const resumePath = getResumePath();
        let htmlContent = fs.readFileSync(resumePath, 'utf-8');

        // Process @VARIABLE syntax
        const lines = htmlContent.split('\n');
        const variables = {};
        let redacted = false;

        // Extract variables
        const contentLines = lines.filter(line => {
            if (line.startsWith('@REDACTED=')) {
                redacted = line.includes('true');
                return false;
            }
            if (line.startsWith('@')) {
                const match = line.match(/@(\w+)=(.+)/);
                if (match) {
                    const [, key, values] = match;
                    const [normal, redactedVal] = values.split('||');
                    variables[key] = redacted && redactedVal ? redactedVal : normal;
                    return false;
                }
            }
            return true;
        });

        // Replace {VARIABLE} with values
        let processedContent = contentLines.join('\n');
        for (const [key, value] of Object.entries(variables)) {
            processedContent = processedContent.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }

        // Convert markdown to HTML
        const html = marked.parse(processedContent);

        // Complete CSS matching resume.css and settings.css
        const completeCSS = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            body {
                font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
                font-size: 14px;
                font-weight: 400;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            
            .spacer {
                margin: 0px auto;
            }
            
            .newline {
                padding-bottom: 6px;
            }
            
            hr.pagebreak {
                page-break-after: always;
                visibility: hidden;
                margin: 0;
                padding: 0;
                height: 0;
                border: none;
            }
            
            div[style*="page-break-before"] {
                padding-top: 40px;
            }
            
            h1 {
                order: 0;
            }
            
            .headerInfo {
                order: 1;
            }
            
            h1, h2, h3, p, a, li {
                color: black;
            }
            
            h2 {
                margin: 10px 0px;
            }
            
            h3 {
                margin: 6px 0px;
            }
            
            h1 {
                color: black;
                text-transform: uppercase;
                text-align: center;
                font-size: 24px;
                margin: 0;
                padding: 0;
            }
            
            h2 {
                border-bottom: 1px solid #000000;
                text-transform: uppercase;
                font-size: 16px;
                padding: 0;
            }
            
            h3 {
                display: flex;
                font-size: 15px;
                padding: 0;
                justify-content: space-between;
                page-break-inside: avoid;
                page-break-after: avoid;
            }
            
            p {
                margin: 0;
                padding: 0;
            }
            
            a {
                color: black;
            }
            
            ul {
                margin: 4px 0;
                padding-left: 24px;
                padding-right: 24px;
            }
            
            .headerInfo > ul {
                display: flex;
                text-align: center;
                justify-content: center;
                margin: 0px auto !important;
                padding: 0;
            }
            
            .headerInfo > ul:first-of-type {
                margin-top: 6px !important;
            }
            
            .headerInfo > ul > li {
                display: inline;
                white-space: pre;
                list-style-type: none;
            }
            
            .headerInfo > ul > li:not(:last-child) {
                margin-right: 8px;
            }
            
            .headerInfo > ul > li:not(:last-child):after {
                content: "•";
                margin-left: 8px;
            }
        `;

        const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>${completeCSS}</style>
</head>
<body>
    ${html}
</body>
</html>
`;

        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

        // Ask user where to save
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save PDF',
            defaultPath: `Resume-${new Date().toISOString().split('T')[0]}.pdf`,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });

        if (!result.canceled && result.filePath) {
            await page.pdf({
                path: result.filePath,
                format: 'Letter',
                margin: { top: '0.4in', right: '0.4in', bottom: '0.4in', left: '0.4in' },
                printBackground: true
            });

            await browser.close();
            return { success: true, path: result.filePath };
        }

        await browser.close();
        return { success: false, error: 'Export cancelled' };
    } catch (error) {
        console.error('PDF export error:', error);
        return { success: false, error: error.message };
    }
});

// App lifecycle
app.whenReady().then(async () => {
    createWindow();

    // Don't check for resume file - let welcome screen handle it
    // setTimeout(() => {
    //     checkResumeFile();
    // }, 1000);

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
