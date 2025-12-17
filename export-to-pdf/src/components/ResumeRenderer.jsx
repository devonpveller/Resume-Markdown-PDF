import React, { useMemo } from 'react'
import { marked } from 'marked'
import { parseVariables, replaceVariables, cleanMarkdown } from './VariableParser'

function ResumeRenderer({ markdown }) {
    const html = useMemo(() => {
        // Parse variables
        const variables = parseVariables(markdown)

        // Replace variable tokens
        let processed = replaceVariables(markdown, variables)

        // Clean up declarations and comments
        processed = cleanMarkdown(processed)

        // Configure marked
        marked.setOptions({
            breaks: false,
            gfm: true
        })

        // Convert to HTML
        let htmlOutput = marked.parse(processed)

        // Fix em-dash entities
        htmlOutput = htmlOutput.replace(/&mdash;/g, '—')

        return htmlOutput
    }, [markdown])

    return <div dangerouslySetInnerHTML={{ __html: html }} />
}

export default ResumeRenderer
