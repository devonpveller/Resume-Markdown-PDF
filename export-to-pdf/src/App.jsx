import React, { useEffect, useState } from 'react'
import ResumeRenderer from './components/ResumeRenderer'
import './App.css'

function App() {
    const [resumeMarkdown, setResumeMarkdown] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [exporting, setExporting] = useState(false)
    const [exportMessage, setExportMessage] = useState('')

    useEffect(() => {
        async function loadResume() {
            try {
                // Fetch from public directory
                const response = await fetch('/resume.md')
                if (!response.ok) throw new Error('Failed to load resume.md')

                const markdown = await response.text()
                setResumeMarkdown(markdown)
                setLoading(false)
            } catch (err) {
                console.error('Error loading resume:', err)
                setError(err.message)
                setLoading(false)
            }
        }

        loadResume()
    }, [])

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

    if (loading) {
        return <div className="loading">Loading resume...</div>
    }

    if (error) {
        return <div className="error">Error loading resume: {error}</div>
    }

    return (
        <div className="app-container">
            <div className="controls no-print">
                <button onClick={handleExport} disabled={exporting} className="export-btn">
                    {exporting ? 'Exporting...' : 'Export PDF (Puppeteer)'}
                </button>
                <button onClick={handlePrint} className="print-btn">
                    Print (Browser)
                </button>
                {exportMessage && <span className="export-message">{exportMessage}</span>}
                <div className="print-instructions">
                    <strong>Browser Print:</strong> Make sure to set margins to "None" or "Minimum" and disable headers/footers
                </div>
            </div>
            <div id="resume-container" className="resume-container">
                <ResumeRenderer markdown={resumeMarkdown} />
            </div>
        </div>
    )
}

export default App
