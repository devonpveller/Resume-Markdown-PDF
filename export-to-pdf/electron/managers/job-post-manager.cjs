/**
 * JobPostManager
 * 
 * Manages job post markdown files with CRUD operations, filename generation,
 * and job context extraction for AI processing.
 * 
 * SOLID Principles:
 * - Single Responsibility: Manages only job post file operations
 * - Open/Closed: Extensible via dependency injection
 * - Liskov Substitution: Accepts any StoragePaths implementation
 * - Interface Segregation: Focused public API for job post operations
 * - Dependency Inversion: Depends on abstractions (StoragePaths)
 * 
 * Design Patterns:
 * - Repository Pattern: Encapsulates file system operations
 * - Dependency Injection: Constructor receives dependencies
 */

const fs = require('fs');
const path = require('path');

class JobPostManager {
    // Private fields for encapsulation
    #storagePaths;

    /**
     * Initialize job post manager with dependencies
     * @param {StoragePaths} storagePaths - Path resolver service
     * @throws {TypeError} If required dependencies not provided
     */
    constructor(storagePaths) {
        if (!storagePaths || typeof storagePaths.getJobPostsDir !== 'function') {
            throw new TypeError('JobPostManager requires a valid StoragePaths instance');
        }

        this.#storagePaths = storagePaths;
        this.#ensureJobPostsDir();
    }

    /**
     * Ensure job posts directory exists
     * @private
     */
    #ensureJobPostsDir() {
        try {
            const dir = this.#storagePaths.getJobPostsDir();
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        } catch (error) {
            console.error('Failed to ensure job posts directory:', error);
        }
    }

    /**
     * Save job post markdown to file
     * @param {string} markdown - Job post markdown content
     * @returns {Object} Result with success, filename, and title
     * @throws {Error} If markdown is empty
     */
    saveJobPost(markdown) {
        if (!markdown || markdown.trim().length === 0) {
            throw new Error('Markdown content cannot be empty');
        }

        // Extract title from H1
        const title = this.#extractTitle(markdown);

        // Generate filename
        const filename = this.#generateFilename(title);

        // Write file
        const filePath = path.join(this.#storagePaths.getJobPostsDir(), filename);
        fs.writeFileSync(filePath, markdown, 'utf-8');

        return {
            success: true,
            filename,
            title
        };
    }

    /**
     * Extract H1 title from markdown
     * @param {string} markdown - Markdown content
     * @returns {string} Title or 'untitled-job-post'
     * @private
     */
    #extractTitle(markdown) {
        const h1Match = markdown.match(/^#\s+(.+)$/m);
        return h1Match ? h1Match[1].trim() : 'untitled-job-post';
    }

    /**
     * Generate filename from title with timestamp
     * @param {string} title - Job post title
     * @returns {string} Sanitized filename
     * @private
     */
    #generateFilename(title) {
        // Sanitize title
        let sanitized = title
            .toLowerCase()
            .normalize('NFD')                    // Normalize unicode
            .replace(/[\u0300-\u036f]/g, '')    // Remove diacritics
            .replace(/[^a-z0-9\s-]/g, '')       // Remove special chars
            .replace(/\s+/g, '-')                // Replace spaces with dashes
            .replace(/-+/g, '-')                 // Remove consecutive dashes
            .trim();

        // Truncate to reasonable length
        if (sanitized.length > 80) {
            sanitized = sanitized.substring(0, 80);
        }

        // Add timestamp
        const timestamp = this.#getTimestamp();
        let filename = `${sanitized}-${timestamp}.md`;

        // Handle duplicates
        const dir = this.#storagePaths.getJobPostsDir();
        let counter = 1;
        while (fs.existsSync(path.join(dir, filename))) {
            filename = `${sanitized}-${timestamp}-${counter}.md`;
            counter++;
        }

        return filename;
    }

    /**
     * Get timestamp in YYYY-MM-DD format
     * @returns {string} Timestamp
     * @private
     */
    #getTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get job post by filename
     * @param {string} filename - Job post filename
     * @returns {Object|null} Job post object or null if not found
     */
    getJobPost(filename) {
        try {
            const filePath = path.join(this.#storagePaths.getJobPostsDir(), filename);

            if (!fs.existsSync(filePath)) {
                return null;
            }

            const content = fs.readFileSync(filePath, 'utf-8');
            const title = this.#extractTitle(content);
            const stats = fs.statSync(filePath);

            return {
                filename,
                title,
                content,
                createdAt: stats.birthtime.toISOString(),
                size: stats.size
            };
        } catch (error) {
            console.error('Failed to get job post:', error);
            return null;
        }
    }

    /**
     * List all job posts
     * @returns {Array} Array of job post summaries
     */
    listJobPosts() {
        try {
            const dir = this.#storagePaths.getJobPostsDir();

            if (!fs.existsSync(dir)) {
                return [];
            }

            const files = fs.readdirSync(dir)
                .filter(file => file.endsWith('.md'));

            const jobPosts = files.map(filename => {
                const filePath = path.join(dir, filename);
                const content = fs.readFileSync(filePath, 'utf-8');
                const title = this.#extractTitle(content);
                const stats = fs.statSync(filePath);

                return {
                    filename,
                    title,
                    createdAt: stats.birthtime.toISOString(),
                    size: stats.size
                };
            });

            // Sort by date descending (newest first)
            jobPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return jobPosts;
        } catch (error) {
            console.error('Failed to list job posts:', error);
            return [];
        }
    }

    /**
     * Delete job post by filename
     * @param {string} filename - Job post filename
     * @returns {boolean} True if deleted, false if not found
     */
    deleteJobPost(filename) {
        try {
            const filePath = path.join(this.#storagePaths.getJobPostsDir(), filename);

            if (!fs.existsSync(filePath)) {
                return false;
            }

            fs.unlinkSync(filePath);
            return true;
        } catch (error) {
            console.error('Failed to delete job post:', error);
            return false;
        }
    }

    /**
     * Extract job context for AI processing
     * @param {string} filename - Job post filename
     * @returns {Object|null} Job context with title, fullText, and sections
     */
    extractJobContext(filename) {
        try {
            const jobPost = this.getJobPost(filename);

            if (!jobPost) {
                return null;
            }

            const sections = this.#parseSections(jobPost.content);

            return {
                title: jobPost.title,
                fullText: jobPost.content,
                sections
            };
        } catch (error) {
            console.error('Failed to extract job context:', error);
            return null;
        }
    }

    /**
     * Parse markdown sections (H2 headers)
     * @param {string} markdown - Markdown content
     * @returns {Array} Array of section objects
     * @private
     */
    #parseSections(markdown) {
        const sections = [];
        const lines = markdown.split('\n');

        let currentSection = null;
        let currentContent = [];

        for (const line of lines) {
            const h2Match = line.match(/^##\s+(.+)$/);

            if (h2Match) {
                // Save previous section
                if (currentSection) {
                    sections.push({
                        heading: currentSection,
                        content: currentContent.join('\n').trim()
                    });
                }

                // Start new section
                currentSection = h2Match[1].trim();
                currentContent = [];
            } else if (currentSection) {
                // Add to current section content
                currentContent.push(line);
            }
        }

        // Save last section
        if (currentSection) {
            sections.push({
                heading: currentSection,
                content: currentContent.join('\n').trim()
            });
        }

        return sections;
    }
}

module.exports = JobPostManager;
