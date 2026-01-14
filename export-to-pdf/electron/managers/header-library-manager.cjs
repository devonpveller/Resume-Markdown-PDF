/**
 * HeaderLibraryManager
 * 
 * Manages the header library (h2 and h3 headers) with CRUD operations,
 * markdown generation, and persistence.
 * 
 * SOLID Principles:
 * - Single Responsibility: Manages only header data (no validation logic)
 * - Open/Closed: Extensible via dependency injection
 * - Liskov Substitution: Accepts any StoragePaths implementation
 * - Interface Segregation: Focused public API for header operations
 * - Dependency Inversion: Depends on abstractions (StoragePaths, Validator)
 * 
 * Design Patterns:
 * - Repository Pattern: Encapsulates data access and persistence
 * - Dependency Injection: Constructor receives dependencies
 */

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class HeaderLibraryManager {
    // Private fields for encapsulation
    #storagePaths;
    #validator;
    #data;
    #hashRegistry;

    /**
     * Initialize header library manager with dependencies
     * @param {StoragePaths} storagePaths - Path resolver service
     * @param {Object} validator - Validation service
     * @throws {TypeError} If required dependencies not provided
     */
    constructor(storagePaths, validator) {
        if (!storagePaths || typeof storagePaths.getHeadersPath !== 'function') {
            throw new TypeError('HeaderLibraryManager requires a valid StoragePaths instance');
        }

        if (!validator || typeof validator.generateHash !== 'function') {
            throw new TypeError('HeaderLibraryManager requires a valid Validator instance');
        }

        this.#storagePaths = storagePaths;
        this.#validator = validator;
        this.#data = null;
        this.#hashRegistry = new Map();

        this.load();
    }

    /**
     * Load header library from disk or initialize if not exists
     * @private
     */
    load() {
        const filePath = this.#storagePaths.getHeadersPath();

        try {
            if (fs.existsSync(filePath)) {
                const rawData = fs.readFileSync(filePath, 'utf-8');
                this.#data = JSON.parse(rawData);

                // Rebuild hash registry for O(1) duplicate detection
                this.#rebuildHashRegistry();
            } else {
                this.#initializeLibrary();
            }
        } catch (error) {
            console.error('Failed to load header library:', error);
            this.#initializeLibrary();
        }
    }

    /**
     * Initialize empty header library structure
     * @private
     */
    #initializeLibrary() {
        this.#data = {
            version: '1.0.0',
            headers: []
        };

        this.#hashRegistry.clear();
        this.#persist();
    }

    /**
     * Rebuild hash registry from current data
     * @private
     */
    #rebuildHashRegistry() {
        this.#hashRegistry.clear();

        for (const header of this.#data.headers) {
            const hash = this.#validator.generateHash(header.text);
            this.#hashRegistry.set(hash, header.id);
        }
    }

    /**
     * Persist library to disk
     * @private
     */
    #persist() {
        try {
            this.#storagePaths.ensureBulletLibraryDir();
            const filePath = this.#storagePaths.getHeadersPath();
            fs.writeFileSync(filePath, JSON.stringify(this.#data, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to persist header library:', error);
            throw error;
        }
    }

    /**
     * Add header to library
     * @param {Object} headerData - Header data object
     * @param {number} headerData.level - Header level (2 or 3)
     * @param {string} headerData.text - Header text
     * @param {string|null} [headerData.parentHeaderId] - Parent header ID (for h3)
     * @param {string|null} [headerData.dateRange] - Date range for h3 (e.g., "Jan 2020 — Present")
     * @returns {Object} Result with success flag, header, and duplicate indicator
     * @throws {Error} If invalid header level
     */
    addHeader(headerData) {
        const { level, text, parentHeaderId = null, dateRange = null } = headerData;

        // Validate header level
        if (level !== 2 && level !== 3) {
            throw new Error(`Invalid header level: ${level}. Must be 2 or 3.`);
        }

        // Check for duplicates using hash
        const hash = this.#validator.generateHash(text);

        if (this.#hashRegistry.has(hash)) {
            const existingId = this.#hashRegistry.get(hash);
            const existingHeader = this.#data.headers.find(h => h.id === existingId);

            if (existingHeader) {
                // Increment usage count
                existingHeader.usageCount += 1;
                existingHeader.lastUsed = new Date().toISOString();
                this.#persist();

                return {
                    success: true,
                    duplicate: true,
                    header: this.#cloneHeader(existingHeader)
                };
            }
        }

        // Create new header
        const newHeader = {
            id: uuidv4(),
            level,
            text,
            parentHeaderId,
            dateRange,
            hash,
            usageCount: 1,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        this.#data.headers.push(newHeader);
        this.#hashRegistry.set(hash, newHeader.id);
        this.#persist();

        return {
            success: true,
            duplicate: false,
            header: this.#cloneHeader(newHeader)
        };
    }

    /**
     * Get header by ID
     * @param {string} id - Header ID
     * @returns {Object|null} Header object or null if not found
     */
    getHeader(id) {
        const header = this.#data.headers.find(h => h.id === id);
        return header ? this.#cloneHeader(header) : null;
    }

    /**
     * Get all headers
     * @returns {Array} Array of header objects (immutable copies)
     */
    getAllHeaders() {
        return this.#data.headers.map(h => this.#cloneHeader(h));
    }

    /**
     * Get subheaders (h3) under a parent header (h2)
     * @param {string} parentHeaderId - Parent header ID
     * @returns {Array} Array of h3 headers
     */
    getSubHeaders(parentHeaderId) {
        return this.#data.headers
            .filter(h => h.level === 3 && h.parentHeaderId === parentHeaderId)
            .map(h => this.#cloneHeader(h));
    }

    /**
     * Generate markdown for a header
     * @param {string} id - Header ID
     * @returns {string} Markdown string
     * @throws {Error} If header not found
     */
    generateMarkdown(id) {
        const header = this.#data.headers.find(h => h.id === id);

        if (!header) {
            throw new Error(`Header not found: ${id}`);
        }

        if (header.level === 2) {
            return `## ${header.text}`;
        }

        // h3 with optional date range
        if (header.dateRange) {
            return `### ${header.text} <span class="spacer"></span> ${header.dateRange}`;
        }

        return `### ${header.text}`;
    }

    /**
     * Delete header from library
     * @param {string} id - Header ID
     * @returns {boolean} True if deleted, false if not found
     */
    deleteHeader(id) {
        const index = this.#data.headers.findIndex(h => h.id === id);

        if (index === -1) {
            return false;
        }

        const header = this.#data.headers[index];

        // Remove from hash registry
        this.#hashRegistry.delete(header.hash);

        // Remove from array
        this.#data.headers.splice(index, 1);

        this.#persist();
        return true;
    }

    /**
     * Find headers by level
     * @param {number} level - Header level (2 or 3)
     * @returns {Array} Array of headers at specified level
     */
    findHeadersByLevel(level) {
        return this.#data.headers
            .filter(h => h.level === level)
            .map(h => this.#cloneHeader(h));
    }

    /**
     * Clone header object to prevent external mutation
     * @param {Object} header - Header object
     * @returns {Object} Cloned header
     * @private
     */
    #cloneHeader(header) {
        return {
            ...header
        };
    }
}

module.exports = HeaderLibraryManager;
