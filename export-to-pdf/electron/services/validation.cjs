/**
 * Validation Service
 * Stateless utility for text validation, hashing, and duplicate detection
 * 
 * SOLID Principles:
 * - Single Responsibility: ONLY handles validation logic
 * - Open/Closed: Extensible via new validation methods
 * - Interface Segregation: Static methods for standalone usage
 */
const crypto = require('crypto');

class Validation {
    /**
     * Generate a consistent hash for bullet text
     * Normalizes text (lowercase, trim whitespace) before hashing
     * 
     * @param {string} text - The text to hash
     * @returns {string} Hexadecimal hash string (first 12 characters)
     */
    static generateHash(text) {
        if (!text || typeof text !== 'string') {
            throw new TypeError('text must be a non-empty string');
        }

        // Normalize: lowercase, collapse whitespace, trim
        const normalized = text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

        const hash = crypto.createHash('sha256').update(normalized).digest('hex');
        return hash.substring(0, 12); // Use first 12 characters
    }

    /**
     * Calculate Levenshtein distance between two strings
     * Used for similarity detection
     * 
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Edit distance between strings
     */
    static levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;

        // Create distance matrix
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

        // Initialize first column and row
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        // Fill matrix
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        return matrix[len1][len2];
    }

    /**
     * Calculate similarity ratio between two strings (0.0 to 1.0)
     * Uses normalized Levenshtein distance
     * 
     * @param {string} text1 - First text
     * @param {string} text2 - Second text
     * @returns {number} Similarity score from 0.0 (completely different) to 1.0 (identical)
     */
    static calculateSimilarity(text1, text2) {
        if (!text1 || !text2) return 0.0;

        // Normalize for comparison
        const normalized1 = text1.toLowerCase().trim();
        const normalized2 = text2.toLowerCase().trim();

        if (normalized1 === normalized2) return 1.0;

        const maxLen = Math.max(normalized1.length, normalized2.length);
        if (maxLen === 0) return 1.0;

        const distance = this.levenshteinDistance(normalized1, normalized2);
        return 1.0 - (distance / maxLen);
    }

    /**
     * Validate bullet text quality using STAR method criteria
     * 
     * @param {string} bulletText - The bullet text to validate
     * @returns {Object} Validation result with quality metrics
     */
    static validateBullet(bulletText) {
        if (!bulletText || typeof bulletText !== 'string') {
            return {
                isValid: false,
                hasStrongVerb: false,
                hasMetrics: false,
                meetsMinLength: false,
                qualityScore: 0,
                issues: ['Invalid or empty bullet text']
            };
        }

        const text = bulletText.trim();
        const issues = [];

        // Check for strong action verbs (STAR method)
        const strongVerbs = [
            'engineered', 'architected', 'implemented', 'developed', 'designed',
            'led', 'managed', 'coordinated', 'optimized', 'enhanced',
            'created', 'built', 'established', 'initiated', 'launched',
            'delivered', 'achieved', 'reduced', 'increased', 'improved',
            'automated', 'streamlined', 'refactored', 'migrated', 'deployed'
        ];

        const hasStrongVerb = strongVerbs.some(verb =>
            text.toLowerCase().startsWith(verb) ||
            text.toLowerCase().includes(' ' + verb + ' ')
        );

        if (!hasStrongVerb) {
            issues.push('Missing strong action verb (Engineered, Architected, Led, etc.)');
        }

        // Check for quantified metrics (numbers, percentages, time)
        const metricPatterns = [
            /\d+%/,                          // Percentages: 25%
            /\d+x/,                          // Multipliers: 5.6x
            /\d+\+?/,                        // Numbers: 20+, 300
            /\d+ms/,                         // Time: 1.3ms
            /\d+s/,                          // Seconds: 10s
            /\d+\s*(users?|people|clients)/, // User counts
            /\$\d+/                          // Dollar amounts
        ];

        const hasMetrics = metricPatterns.some(pattern => pattern.test(text));

        if (!hasMetrics) {
            issues.push('No quantified metrics or results (add numbers, %, time savings)');
        }

        // Check minimum length (STAR bullets should be substantial)
        const minLength = 30;
        const meetsMinLength = text.length >= minLength;

        if (!meetsMinLength) {
            issues.push(`Bullet too short (${text.length} chars, minimum ${minLength})`);
        }

        // Calculate quality score (0-100)
        let qualityScore = 0;
        if (hasStrongVerb) qualityScore += 40;
        if (hasMetrics) qualityScore += 40;
        if (meetsMinLength) qualityScore += 20;

        const isValid = hasStrongVerb && hasMetrics && meetsMinLength;

        return {
            isValid,
            hasStrongVerb,
            hasMetrics,
            meetsMinLength,
            qualityScore,
            issues: issues.length > 0 ? issues : null
        };
    }

    /**
     * Find similar bullets in existing library
     * 
     * @param {string} text - Text to search for
     * @param {Array} existingBullets - Array of existing bullet objects with {id, text, textHash}
     * @param {number} threshold - Minimum similarity threshold (0.0 to 1.0, default 0.85)
     * @returns {Array} Array of {bulletId, similarity} objects sorted by similarity descending
     */
    static findSimilarBullets(text, existingBullets, threshold = 0.85) {
        if (!text || !existingBullets || existingBullets.length === 0) {
            return [];
        }

        const similarities = existingBullets.map(bullet => ({
            bulletId: bullet.id,
            text: bullet.text,
            similarity: this.calculateSimilarity(text, bullet.text)
        }))
            .filter(item => item.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity);

        return similarities;
    }

    /**
     * Check if text is an exact duplicate (via hash)
     * 
     * @param {string} text - Text to check
     * @param {Array} existingBullets - Array of existing bullet objects with {id, textHash}
     * @returns {Object} {isDuplicate: boolean, existingId: string|null}
     */
    static checkExactDuplicate(text, existingBullets) {
        if (!text || !existingBullets || existingBullets.length === 0) {
            return { isDuplicate: false, existingId: null };
        }

        const hash = this.generateHash(text);
        const duplicate = existingBullets.find(bullet => bullet.textHash === hash);

        return {
            isDuplicate: !!duplicate,
            existingId: duplicate ? duplicate.id : null
        };
    }

    /**
     * Validate and check for duplicates in one call
     * Convenience method combining quality validation and duplicate detection
     * 
     * @param {string} text - Text to validate
     * @param {Array} existingBullets - Existing bullets array
     * @returns {Object} Combined validation and duplicate check results
     */
    static validateAndCheckDuplicate(text, existingBullets) {
        const validation = this.validateBullet(text);
        const duplicateCheck = this.checkExactDuplicate(text, existingBullets);
        const similarBullets = this.findSimilarBullets(text, existingBullets, 0.85);

        return {
            ...validation,
            isDuplicate: duplicateCheck.isDuplicate,
            existingId: duplicateCheck.existingId,
            similarBullets: similarBullets.length > 0 ? similarBullets : null
        };
    }
}

module.exports = Validation;
