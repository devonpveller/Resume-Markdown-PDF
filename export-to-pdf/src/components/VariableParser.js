/**
 * Parses resume.lol variable syntax
 * @VARIABLE=normalValue||redactedValue
 * @REDACTED=true/false
 */
export function parseVariables(markdown) {
    const variables = {}

    // Extract @REDACTED value first
    const redactedMatch = markdown.match(/@REDACTED=(true|false)/)
    const useRedacted = redactedMatch && redactedMatch[1] === 'true'

    // Extract all variable declarations
    const lines = markdown.split(/\r?\n/)
    for (const line of lines) {
        const varMatch = line.match(/^@(\w+)=(.+)\|\|(.+)$/)
        if (varMatch) {
            const [, varName, normalValue, redactedValue] = varMatch
            variables[varName] = useRedacted ? redactedValue.trim() : normalValue.trim()
        }
    }

    return variables
}

/**
 * Replaces {VARIABLE} tokens with actual values
 */
export function replaceVariables(markdown, variables) {
    return markdown.replace(/\{(\w+)\}/g, (match, varName) => {
        return variables[varName] || match
    })
}

/**
 * Removes variable declarations and HTML comments
 */
export function cleanMarkdown(markdown) {
    // Remove variable declarations
    markdown = markdown.replace(/^@\w+=.+$/gm, '')

    // Remove HTML comments
    markdown = markdown.replace(/<!--[\s\S]*?-->/g, '')

    return markdown
}
