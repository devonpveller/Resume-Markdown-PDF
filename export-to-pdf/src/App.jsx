import React, { useEffect, useState } from 'react'
import ResumeRenderer from './components/ResumeRenderer'
import './App.css'

function App() {
    const [resumeMarkdown, setResumeMarkdown] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

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

    if (loading) {
        return <div className="loading">Loading resume...</div>
    }

    if (error) {
        return <div className="error">Error loading resume: {error}</div>
    }

    return (
        <div className="app-container">
            <div id="resume-container" className="resume-container">
                <ResumeRenderer markdown={resumeMarkdown} />
            </div>
        </div>
    )
}

export default App
