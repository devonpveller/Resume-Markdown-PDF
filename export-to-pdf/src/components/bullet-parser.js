/**
 * bulletParser.js
 * 
 * Pure JavaScript service for parsing markdown resume content into structured data.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only parses markdown (no file I/O, no validation)
 * - Open/Closed: Extensible parsing rules via private methods
 * - Interface Segregation: Single focused parseMarkdown function
 * 
 * Design Patterns:
 * - Strategy Pattern: Different parsing strategies for headers/bullets
 * - Pure Functions: No side effects, testable in isolation
 */

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clean HTML tags from text
 * @param {string} text - Text with potential HTML
 * @returns {string} Text without HTML tags
 */
function cleanHtmlTags(text) {
    return text.replace(/<[^>]+>/g, '');
}

/**
 * Check if bullet follows STAR method (very basic heuristic)
 * @param {string} text - Bullet text
 * @returns {boolean} True if appears to follow STAR
 */
function isStarMethod(text) {
    // Look for quantified results (numbers, percentages)
    const hasNumbers = /\d+[%x]|\d+\+/.test(text);

    // Look for action verbs
    const actionVerbs = /^(Achieved|Engineered|Implemented|Built|Led|Designed|Architected|Optimized|Reduced|Increased)/i;
    const hasActionVerb = actionVerbs.test(text);

    // Look for result indicators
    const resultWords = /(achieving|by|resulting|improving|reducing)/i;
    const hasResultIndicator = resultWords.test(text);

    return hasNumbers && (hasActionVerb || hasResultIndicator);
}

/**
 * Parse markdown resume content into structured data
 * @param {string} markdown - Markdown content
 * @returns {Object} Parsed data with headers and bullets
 */
function parseMarkdown(markdown) {
    if (!markdown || markdown.trim().length === 0) {
        return { headers: [], bullets: [] };
    }

    const lines = markdown.split('\n');
    const headers = [];
    const bullets = [];

    let currentH2 = null;
    let currentH3 = null;
    let inMultiLineBullet = false;
    let currentBullet = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Skip empty lines (unless in multi-line bullet)
        if (!trimmedLine && !inMultiLineBullet) {
            continue;
        }

        // Parse H2 headers
        const h2Match = trimmedLine.match(/^##\s+(.+)$/);
        if (h2Match) {
            const headerText = h2Match[1].trim();
            const header = {
                id: generateId(),
                level: 2,
                text: headerText,
                parentHeaderId: null,
                dateRange: null
            };

            headers.push(header);
            currentH2 = header;
            currentH3 = null;
            inMultiLineBullet = false;
            continue;
        }

        // Parse H3 headers with optional date ranges
        const h3Match = trimmedLine.match(/^###\s+(.+?)(?:\s*<span[^>]*>.*?<\/span>\s*(.+))?$/);
        if (h3Match) {
            const headerText = h3Match[1].trim();
            const dateRange = h3Match[2] ? h3Match[2].trim() : null;

            const header = {
                id: generateId(),
                level: 3,
                text: headerText,
                parentHeaderId: currentH2 ? currentH2.id : null,
                dateRange
            };

            headers.push(header);
            currentH3 = header;
            inMultiLineBullet = false;
            continue;
        }

        // Parse bullet points
        const bulletMatch = line.match(/^(\s*)-\s+(.+)$/);
        if (bulletMatch) {
            // Finish previous multi-line bullet if any
            if (inMultiLineBullet && currentBullet) {
                currentBullet.text = currentBullet.text.trim();
                currentBullet.text = cleanHtmlTags(currentBullet.text);
                currentBullet.isStarMethod = isStarMethod(currentBullet.text);
            }

            const indent = bulletMatch[1].length;
            const bulletText = bulletMatch[2].trim();
            const nestedLevel = Math.floor(indent / 2);

            const bullet = {
                id: generateId(),
                text: bulletText,
                parentHeaderId: currentH3 ? currentH3.id : null,
                nestedLevel,
                sectionContext: {
                    h2Text: currentH2 ? currentH2.text : null,
                    h3Text: currentH3 ? currentH3.text : null
                },
                isStarMethod: false // Will be set when bullet is complete
            };

            bullets.push(bullet);
            currentBullet = bullet;
            inMultiLineBullet = true;
            continue;
        }

        // Handle multi-line bullet continuation
        if (inMultiLineBullet && currentBullet && trimmedLine) {
            // Check if line is indented (continuation of bullet)
            if (line.startsWith('  ') || line.startsWith('\t')) {
                currentBullet.text += ' ' + trimmedLine;
                continue;
            } else {
                // Not indented, finish current bullet
                currentBullet.text = currentBullet.text.trim();
                currentBullet.text = cleanHtmlTags(currentBullet.text);
                currentBullet.isStarMethod = isStarMethod(currentBullet.text);
                inMultiLineBullet = false;
                currentBullet = null;
            }
        }
    }

    // Finish last bullet if still in multi-line mode
    if (inMultiLineBullet && currentBullet) {
        currentBullet.text = currentBullet.text.trim();
        currentBullet.text = cleanHtmlTags(currentBullet.text);
        currentBullet.isStarMethod = isStarMethod(currentBullet.text);
    }

    return {
        headers,
        bullets
    };
}

module.exports = {
    parseMarkdown
};
