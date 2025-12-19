import React, { useEffect, useState } from 'react'
import PagedResumeRenderer from './components/PagedResumeRenderer'
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

    useEffect(() => {
        // Detect if running in Electron
        const hasElectronAPI = window.electronAPI?.isElectron || false
        console.log('Electron API detected:', hasElectronAPI)
        console.log('window.electronAPI:', window.electronAPI)
        setIsElectron(hasElectronAPI)
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

            setResumeMarkdown(markdown)
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
        return <div className="error">Error loading resume: {error}</div>
    }

    return (
        <div className="app-container">
            <div className="controls no-print">
                <div className="title">
                    Resume Live Preview & Export
                    {isElectron && <span className="electron-badge">Desktop App</span>}
                </div>
                <div className="button-group">
                    {isElectron && (
                        <button 
                            onClick={() => window.electronAPI.openResumeFile()} 
                            className="edit-btn"
                            title="Open resume.md in your default editor"
                        >
                            📝 Edit Resume
                        </button>
                    )}
                    <button onClick={handleExport} disabled={exporting} className="export-btn">
                        {exporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                    <div className="export-path-container">
                        <span className="export-info">Saves to: {exportPath}</span>
                        <button 
                            onClick={handleChangeDir} 
                            className="change-dir-btn"
                        >
                            {isElectron ? 'Choose Folder' : showDirInput ? 'Cancel' : 'Change Directory'}
                        </button>
                    </div>
                    {showDirInput && !isElectron && (
                        <div className="dir-input-container">
                            <input
                                type="text"
                                value={customDir}
                                onChange={(e) => setCustomDir(e.target.value)}
                                placeholder="Enter full directory path (e.g., C:\\Users\\Devon\\Documents)"
                                className="dir-input"
                            />
                            <button onClick={handleChangeDir} className="set-dir-btn">
                                Set Directory
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={handlePrint} className="print-btn" title="Note: Creates PDF as images, text is not selectable">
                    Browser Print
                </button>
                <div className="browser-print-warning">
                    ⚠️ Browser Print creates images only (not ATS-friendly). Use "Export PDF" for text-based PDFs.
                </div>
                {exportMessage && <span className="export-message">{exportMessage}</span>}
                <div className="auto-refresh-indicator">
                    🔄 Auto-refreshes when resume.md changes (Last updated: {lastSyncTime.toLocaleTimeString()})
                </div>
            </div>
            <PagedResumeRenderer markdown={resumeMarkdown} />
        </div>
    )
}

export default App
