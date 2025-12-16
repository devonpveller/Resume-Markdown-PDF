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

    async function loadResume() {
        try {
            // Fetch from public directory
            const response = await fetch('/resume.md')
            if (!response.ok) throw new Error('Failed to load resume.md')

            // Store last modified time for auto-refresh
            const modified = response.headers.get('Last-Modified')
            if (lastModified && modified && lastModified !== modified) {
                console.log('Resume file changed, reloading...')
            }
            setLastModified(modified)

            const markdown = await response.text()
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

        // Fetch the export path from the server
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
    }, [lastModified])

    const handleExport = async () => {
        setExporting(true)
        setExportMessage('Exporting...')

        try {
            const response = await fetch('/api/export-pdf', {
                method: 'POST'
            })

            if (!response.ok) throw new Error('Export failed')

            const result = await response.json()
            setExportMessage('✓ PDF exported successfully!')
            setTimeout(() => setExportMessage(''), 3000)
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
                <div className="title">Resume Live Preview & Export</div>
                <div className="button-group">
                    <button onClick={handleExport} disabled={exporting} className="export-btn">
                        {exporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                    <div className="export-path-container">
                        <span className="export-info">Saves to: {exportPath}</span>
                        <button onClick={() => setShowDirInput(!showDirInput)} className="change-dir-btn">
                            {showDirInput ? 'Cancel' : 'Change Directory'}
                        </button>
                    </div>
                    {showDirInput && (
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
                <button onClick={handlePrint} className="print-btn">
                    Browser Print
                </button>
                {exportMessage && <span className="export-message">{exportMessage}</span>}
                <div className="auto-refresh-indicator">🔄 Auto-refreshes when resume.md changes</div>
            </div>
            <PagedResumeRenderer markdown={resumeMarkdown} />
        </div>
    )
}

export default App
