import React, { useEffect, useState } from 'react'
import PagedResumeRenderer from './components/PagedResumeRenderer'
import { BulletLibraryPanel } from './components/BulletLibraryPanel'
import './App.css'

function App() {
    const [resumeMarkdown, setResumeMarkdown] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [exporting, setExporting] = useState(false)
    const [exportMessage, setExportMessage] = useState('')
    const [lastModified, setLastModified] = useState(null)
    const [exportPath, setExportPath] = useState('Loading...')
    const [showDirInput, setShowDirInput] = useState(false)
    const [customDir, setCustomDir] = useState('')
    const [lastSyncTime, setLastSyncTime] = useState(new Date())
    const [isElectron, setIsElectron] = useState(false)
    const [showBulletLibrary, setShowBulletLibrary] = useState(false)
    const [showViewMenu, setShowViewMenu] = useState(false)

    // Function to load CSS
    const loadCSS = async () => {
        if (window.electronAPI?.readCSS) {
            try {
                const result = await window.electronAPI.readCSS();
                if (result.success && result.content) {
                    const styleId = 'user-resume-css';
                    let styleEl = document.getElementById(styleId);
                    if (!styleEl) {
                        styleEl = document.createElement('style');
                        styleEl.id = styleId;
                        document.head.appendChild(styleEl);
                    }
                    styleEl.textContent = result.content;
                    console.log('User CSS loaded and injected');
                }
            } catch (err) {
                console.error('Failed to load user CSS:', err);
            }
        }
    };

    useEffect(() => {
        // Detect if running in Electron
        const hasElectronAPI = window.electronAPI?.isElectron || false
        console.log('Electron API detected:', hasElectronAPI)
        console.log('window.electronAPI:', window.electronAPI)
        setIsElectron(hasElectronAPI)

        // Load custom CSS if in Electron
        if (hasElectronAPI) {
            loadCSS();
        }
    }, [])

    async function loadResume() {
        try {
            let markdown = '';

            // Use Electron IPC if available (packaged app)
            if (window.electronAPI && window.electronAPI.readResume) {
                const result = await window.electronAPI.readResume();
                if (result.success) {
                    markdown = result.content;
                    setLastSyncTime(new Date());
                    // Reload CSS when resume changes (in case CSS was just created)
                    loadCSS();
                } else {
                    throw new Error(result.error || 'Failed to read resume');
                }
            } else {
                // Fetch from public directory (web/dev mode)
                const response = await fetch('/resume.md')
                if (!response.ok) throw new Error('Failed to load resume.md')

                // Store last modified time for auto-refresh
                const modified = response.headers.get('Last-Modified')
                if (lastModified && modified && lastModified !== modified) {
                    console.log('Resume file changed, reloading...')
                    setLastSyncTime(new Date())
                }
                setLastModified(modified)
                markdown = await response.text()
            }

            // Process @VARIABLE syntax (same as PDF export)
            const lines = markdown.split('\n');
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

            setResumeMarkdown(processedContent)
            setLoading(false)
        } catch (err) {
            console.error('Error loading resume:', err)
            setError(err.message)
            setLoading(false)
        }
    }

    useEffect(() => {
        loadResume()

        // Set up file watching based on environment
        if (window.electronAPI && window.electronAPI.onResumeUpdated) {
            // Electron mode - use IPC file watcher
            window.electronAPI.watchResume();
            window.electronAPI.onResumeUpdated(() => {
                console.log('Resume file changed (Electron watcher)...');
                loadResume();
            });

            // Get export path
            window.electronAPI.getResumePath()
                .then(path => setExportPath(path))
                .catch(() => setExportPath('export-to-pdf folder'));
        } else {
            // Web mode - fetch export path from server
            fetch('/api/export-path')
                .then(res => res.json())
                .then(data => setExportPath(data.path))
                .catch(() => setExportPath('export-to-pdf folder'))

            // Check for file changes every 2 seconds
            const interval = setInterval(async () => {
                try {
                    const response = await fetch('/resume.md', { method: 'HEAD' })
                    const currentModified = response.headers.get('Last-Modified')

                    if (lastModified && currentModified && lastModified !== currentModified) {
                        console.log('File changed, reloading...')
                        await loadResume()
                    }
                } catch (err) {
                    console.error('Error checking for updates:', err)
                }
            }, 2000)

            return () => clearInterval(interval)
        }
    }, [lastModified])

    const handleExport = async () => {
        setExporting(true)
        setExportMessage('Exporting...')

        try {
            // Use Electron IPC if available
            if (window.electronAPI && window.electronAPI.exportPDF) {
                const result = await window.electronAPI.exportPDF();
                if (result.success) {
                    setExportMessage(`✓ PDF exported to: ${result.path}`);
                } else {
                    throw new Error(result.error || 'Export failed');
                }
            } else {
                // Web mode - use API endpoint
                const response = await fetch('/api/export-pdf', {
                    method: 'POST'
                })

                if (!response.ok) throw new Error('Export failed')

                const result = await response.json()
                setExportMessage('✓ PDF exported successfully!')
            }
            setTimeout(() => setExportMessage(''), 5000)
        } catch (err) {
            setExportMessage('✗ Export failed: ' + err.message)
            setTimeout(() => setExportMessage(''), 5000)
        } finally {
            setExporting(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleChangeDir = async () => {
        // In Electron, use native file dialog
        if (isElectron && window.electronAPI && window.electronAPI.selectExportDirectory) {
            const directory = await window.electronAPI.selectExportDirectory()
            if (directory) {
                setExportPath(directory)
                setShowDirInput(false)
            }
            return
        }

        // Web version - manual input
        if (!customDir.trim()) {
            alert('Please enter a valid directory path')
            return
        }

        try {
            const response = await fetch('/api/set-export-dir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ directory: customDir })
            })

            if (!response.ok) throw new Error('Failed to set directory')

            const result = await response.json()
            setExportPath(result.path)
            setShowDirInput(false)
            setCustomDir('')
        } catch (err) {
            alert('Error setting directory: ' + err.message)
        }
    }

    if (loading) {
        return <div className="loading">Loading resume...</div>
    }

    if (error) {
        const handleCreateFromTemplate = async () => {
            if (window.electronAPI?.createFromTemplate) {
                await window.electronAPI.createFromTemplate();
                loadResume();
            }
        };

        const handleImportResume = async () => {
            if (window.electronAPI?.importResume) {
                await window.electronAPI.importResume();
                loadResume();
            }
        };

        const handleCreateBlank = async () => {
            if (window.electronAPI?.createBlank) {
                await window.electronAPI.createBlank();
                loadResume();
            }
        };

        return (
            <div className="welcome-screen">
                <h1>Welcome to Resume PDF Exporter</h1>
                <p>Your professional resume toolkit with live preview and PDF export.</p>
                <div className="welcome-message">
                    <h2>Getting Started</h2>
                    <p>Choose how you'd like to begin:</p>
                    <div className="welcome-buttons">
                        <button onClick={handleCreateFromTemplate} className="welcome-btn">
                            <span className="btn-icon">📄</span>
                            <span className="btn-title">New from Template</span>
                            <span className="btn-desc">Start with a pre-formatted template</span>
                        </button>
                        <button onClick={handleImportResume} className="welcome-btn">
                            <span className="btn-icon">📁</span>
                            <span className="btn-title">Import Resume</span>
                            <span className="btn-desc">Import an existing resume.md file</span>
                        </button>
                        <button onClick={handleCreateBlank} className="welcome-btn">
                            <span className="btn-icon">✏️</span>
                            <span className="btn-title">Create Blank</span>
                            <span className="btn-desc">Start from scratch</span>
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="app-container">
            <div className="menu-bar no-print">
                <div className="title">
                    Resume Live Preview & Export
                    {isElectron && <span className="electron-badge">Desktop App</span>}
                </div>
                <div className="menu-items">
                    {isElectron && (
                        <div className="menu-item">
                            <button
                                className="menu-button"
                                onClick={() => setShowViewMenu(!showViewMenu)}
                            >
                                View ▼
                            </button>
                            {showViewMenu && (
                                <div className="dropdown-menu">
                                    <button
                                        onClick={() => {
                                            setShowBulletLibrary(!showBulletLibrary);
                                            setShowViewMenu(false);
                                        }}
                                        className="dropdown-item"
                                    >
                                        {showBulletLibrary ? '✓' : '  '} Bullet Library
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {isElectron && (
                        <button
                            onClick={() => window.electronAPI.openResumeFile()}
                            className="menu-button"
                            title="Open resume.md in your default editor"
                        >
                            📝 Edit
                        </button>
                    )}
                    <button onClick={handleExport} disabled={exporting} className="menu-button export-btn">
                        {exporting ? 'Exporting...' : '📄 Export PDF'}
                    </button>
                    <button onClick={handlePrint} className="menu-button" title="Note: Creates PDF as images, text is not selectable">
                        🖨️ Print
                    </button>
                    {isElectron && (
                        <button
                            onClick={async () => {
                                if (confirm('Are you sure you want to start over? This will delete your current resume.')) {
                                    await window.electronAPI.resetToWelcome();
                                }
                            }}
                            className="menu-button reset-btn"
                            title="Return to welcome screen"
                        >
                            🔄 Reset
                        </button>
                    )}
                </div>
            </div>
            {exportMessage && <div className="export-message no-print">{exportMessage}</div>}
            <div className="content-wrapper">
                {showBulletLibrary && isElectron && (
                    <div className="left-panel no-print">
                        <BulletLibraryPanel />
                    </div>
                )}
                <div className="main-content">
                    <PagedResumeRenderer markdown={resumeMarkdown} />
                </div>
            </div>
        </div>
    )
}

export default App
