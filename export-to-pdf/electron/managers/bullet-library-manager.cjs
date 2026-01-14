/**
 * Bullet Library Manager
 * Manages bullet CRUD operations, variant management, and duplicate detection
 * 
 * SOLID Principles:
 * - Single Responsibility: ONLY manages bullet library data
 * - Open/Closed: Extensible via new methods, closed for modification
 * - Liskov Substitution: Implements consistent manager interface
 * - Interface Segregation: Public API exposes only necessary methods
 * - Dependency Inversion: Depends on abstractions (StoragePaths, Validation)
 * 
 * Design Patterns:
 * - Repository Pattern: Encapsulates data access
 * - Factory Pattern: Creates bullets/variants with consistent structure
 * - Singleton: Single instance per app (via factory in main.cjs)
 */
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class BulletLibraryManager {
    // Private fields (ES2022 syntax) - encapsulation
    #data = null;
    #hashRegistry = new Map();  // Maps hash -> bullet/variant ID for fast duplicate lookup
    #loaded = false;

    /**
     * Constructor with dependency injection
     * @param {StoragePaths} storagePaths - Path resolver instance
     * @param {Validation} validator - Validation service
     */
    constructor(storagePaths, validator) {
        if (!storagePaths || typeof storagePaths.getBulletsPath !== 'function') {
            throw new TypeError('storagePaths must be a valid StoragePaths instance');
        }
        if (!validator || typeof validator.generateHash !== 'function') {
            throw new TypeError('validator must be a valid Validation service');
        }

        this.paths = storagePaths;
        this.validator = validator;
    }

    /**
     * Load bullet library from disk
     * Creates empty library if none exists
     */
    load() {
        if (this.#loaded && this.#data) {
            return; // Already loaded
        }

        this.paths.ensureBulletLibraryDir();
        const bulletsPath = this.paths.getBulletsPath();

        if (fs.existsSync(bulletsPath)) {
            const content = fs.readFileSync(bulletsPath, 'utf8');
            this.#data = JSON.parse(content);

            // Rebuild hash registry
            this.#rebuildHashRegistry();
        } else {
            // Create empty library
            this.#data = {
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                totalBullets: 0,
                bullets: []
            };
            this.#save();
        }

        this.#loaded = true;
    }

    /**
     * Save library to disk
     * @private
     */
    #save() {
        this.#data.lastUpdated = new Date().toISOString();
        this.#data.totalBullets = this.#data.bullets.length;

        const bulletsPath = this.paths.getBulletsPath();
        fs.writeFileSync(bulletsPath, JSON.stringify(this.#data, null, 2), 'utf8');
    }

    /**
     * Rebuild hash registry from loaded data
     * @private
     */
    #rebuildHashRegistry() {
        this.#hashRegistry.clear();

        for (const bullet of this.#data.bullets) {
            this.#hashRegistry.set(bullet.textHash, bullet.id);

            // Register accepted variant hashes
            for (const variant of bullet.variants || []) {
                if (variant.accepted) {
                    this.#hashRegistry.set(variant.textHash, variant.id);
                }
            }
        }
    }

    /**
     * Create a bullet object with consistent structure
     * @private
     */
    #createBullet(bulletData) {
        const text = bulletData.text.trim();
        const textHash = this.validator.generateHash(text);
        const now = new Date().toISOString();

        return {
            id: uuidv4(),
            text,
            textHash,
            createdAt: now,
            updatedAt: now,
            source: {
                type: bulletData.sourceResume ? 'resume' : 'manual',
                resumeFile: bulletData.sourceResume || null,
                lineNumber: bulletData.lineNumber || null
            },
            parentHeader: {
                headerId: bulletData.parentHeader.headerId || null,
                headerText: bulletData.parentHeader.headerText,
                headerLevel: bulletData.parentHeader.headerLevel,
                sectionHeader: bulletData.parentHeader.sectionHeader || null
            },
            usageCount: 0,
            lastUsed: null,
            tags: bulletData.tags || [],
            variants: []
        };
    }

    /**
     * Create a variant object with consistent structure
     * @private
     */
    #createVariant(variantData) {
        const text = variantData.text.trim();
        const textHash = this.validator.generateHash(text);

        return {
            id: uuidv4(),
            text,
            textHash,
            createdAt: new Date().toISOString(),
            source: variantData.source || 'manual',
            model: variantData.model || null,
            jobPostRef: variantData.jobPostRef || null,
            accepted: false,  // CRITICAL: Always false until explicitly accepted
            acceptedAt: null
        };
    }

    /**
     * Check if text hash already exists
     * @private
     */
    #isDuplicateHash(hash) {
        return this.#hashRegistry.has(hash);
    }

    /**
     * Register hash in registry
     * @private
     */
    #registerHash(hash, id) {
        this.#hashRegistry.set(hash, id);
    }

    /**
     * Unregister hash from registry
     * @private
     */
    #unregisterHash(hash) {
        this.#hashRegistry.delete(hash);
    }

    /**
     * Add a new bullet to the library
     * 
     * @param {Object} bulletData - Bullet data
     * @param {string} bulletData.text - Bullet text content
     * @param {Object} bulletData.parentHeader - Parent header reference
     * @param {string} bulletData.parentHeader.headerText - Header text
     * @param {number} bulletData.parentHeader.headerLevel - 2 or 3
     * @param {string} [bulletData.sourceResume] - Original resume filename
     * 
     * @returns {Object} Result with success, bullet, or duplicate info
     */
    addBullet(bulletData) {
        this.#ensureLoaded();

        // Validation
        if (!bulletData || typeof bulletData !== 'object') {
            throw new TypeError('bulletData must be an object');
        }
        if (!bulletData.text || typeof bulletData.text !== 'string') {
            throw new TypeError('bulletData.text must be a non-empty string');
        }
        if (bulletData.text.trim().length < 10) {
            throw new Error('Bullet text must be at least 10 characters');
        }
        if (!bulletData.parentHeader || !bulletData.parentHeader.headerText) {
            throw new Error('bulletData.parentHeader is required');
        }

        const text = bulletData.text.trim();
        const textHash = this.validator.generateHash(text);

        // Check for exact duplicate
        if (this.#isDuplicateHash(textHash)) {
            const existingId = this.#hashRegistry.get(textHash);
            const existingBullet = this.#data.bullets.find(b => b.id === existingId);

            if (existingBullet) {
                // Increment usage count
                existingBullet.usageCount++;
                existingBullet.updatedAt = new Date().toISOString();
                this.#save();

                return {
                    success: false,
                    duplicate: true,
                    existingId: existingId,
                    message: 'Exact duplicate found - usage count incremented'
                };
            }
        }

        // Create and add bullet
        const bullet = this.#createBullet(bulletData);
        this.#data.bullets.push(bullet);
        this.#registerHash(bullet.textHash, bullet.id);
        this.#save();

        return {
            success: true,
            bullet: this.#cloneBullet(bullet)
        };
    }

    /**
     * Get bullet by ID
     * Returns immutable copy to prevent external modification
     * 
     * @param {string} id - Bullet ID
     * @returns {Object|null} Bullet object or null if not found
     */
    getBullet(id) {
        this.#ensureLoaded();

        const bullet = this.#data.bullets.find(b => b.id === id);
        return bullet ? this.#cloneBullet(bullet) : null;
    }

    /**
     * Get all bullets
     * Returns immutable copies
     * 
     * @returns {Array} Array of bullet objects
     */
    getAllBullets() {
        this.#ensureLoaded();
        return this.#data.bullets.map(b => this.#cloneBullet(b));
    }

    /**
     * Find bullets by section header
     * 
     * @param {string} sectionHeader - Section header text (e.g., "Experience")
     * @returns {Array} Array of matching bullets
     */
    findBulletsBySection(sectionHeader) {
        this.#ensureLoaded();

        return this.#data.bullets
            .filter(bullet => {
                // Match if bullet's direct header matches OR if it's under that section
                return bullet.parentHeader.headerText === sectionHeader ||
                    bullet.parentHeader.sectionHeader === sectionHeader;
            })
            .map(b => this.#cloneBullet(b));
    }

    /**
     * Add a pending variant to a bullet
     * Variants are NOT added to hash registry until accepted
     * 
     * @param {Object} variantData - Variant data
     * @param {string} variantData.bulletId - Target bullet ID
     * @param {string} variantData.text - Variant text
     * @param {string} variantData.source - Source type (e.g., 'ai-rephrase')
     * @param {string} [variantData.model] - AI model used
     * @param {string} [variantData.jobPostRef] - Job post ID reference
     * 
     * @returns {Object} Result with success and variant
     */
    addPendingVariant(variantData) {
        this.#ensureLoaded();

        const bullet = this.#data.bullets.find(b => b.id === variantData.bulletId);
        if (!bullet) {
            throw new Error(`Bullet with ID ${variantData.bulletId} not found`);
        }

        const text = variantData.text.trim();
        const textHash = this.validator.generateHash(text);

        // Check if this exact text is already registered (bullet or accepted variant)
        if (this.#isDuplicateHash(textHash)) {
            return {
                success: false,
                duplicate: true,
                existingId: this.#hashRegistry.get(textHash),
                message: 'Variant text matches existing bullet or accepted variant'
            };
        }

        // Create variant (accepted = false by default)
        const variant = this.#createVariant(variantData);
        bullet.variants.push(variant);
        bullet.updatedAt = new Date().toISOString();
        this.#save();

        return {
            success: true,
            variant: { ...variant }
        };
    }

    /**
     * Accept a variant
     * Marks variant as accepted and registers its hash
     * 
     * @param {string} bulletId - Bullet ID
     * @param {string} variantId - Variant ID
     * @returns {Object} Result with success and updated variant
     */
    acceptVariant(bulletId, variantId) {
        this.#ensureLoaded();

        const bullet = this.#data.bullets.find(b => b.id === bulletId);
        if (!bullet) {
            throw new Error(`Bullet with ID ${bulletId} not found`);
        }

        const variant = bullet.variants.find(v => v.id === variantId);
        if (!variant) {
            throw new Error(`Variant with ID ${variantId} not found`);
        }

        if (variant.accepted) {
            return {
                success: false,
                message: 'Variant already accepted'
            };
        }

        // Mark as accepted and register hash
        variant.accepted = true;
        variant.acceptedAt = new Date().toISOString();
        this.#registerHash(variant.textHash, variant.id);

        bullet.updatedAt = new Date().toISOString();
        this.#save();

        return {
            success: true,
            variant: { ...variant }
        };
    }

    /**
     * Reject a variant
     * Removes variant from bullet
     * 
     * @param {string} bulletId - Bullet ID
     * @param {string} variantId - Variant ID
     * @returns {Object} Result with success
     */
    rejectVariant(bulletId, variantId) {
        this.#ensureLoaded();

        const bullet = this.#data.bullets.find(b => b.id === bulletId);
        if (!bullet) {
            throw new Error(`Bullet with ID ${bulletId} not found`);
        }

        const variantIndex = bullet.variants.findIndex(v => v.id === variantId);
        if (variantIndex === -1) {
            throw new Error(`Variant with ID ${variantId} not found`);
        }

        const variant = bullet.variants[variantIndex];

        // Unregister hash if it was accepted
        if (variant.accepted) {
            this.#unregisterHash(variant.textHash);
        }

        // Remove variant
        bullet.variants.splice(variantIndex, 1);
        bullet.updatedAt = new Date().toISOString();
        this.#save();

        return {
            success: true
        };
    }

    /**
     * Delete a bullet from the library
     * 
     * @param {string} id - Bullet ID
     * @returns {boolean} True if deleted, false if not found
     */
    deleteBullet(id) {
        this.#ensureLoaded();

        const index = this.#data.bullets.findIndex(b => b.id === id);
        if (index === -1) {
            return false;
        }

        const bullet = this.#data.bullets[index];

        // Unregister all hashes
        this.#unregisterHash(bullet.textHash);
        for (const variant of bullet.variants) {
            if (variant.accepted) {
                this.#unregisterHash(variant.textHash);
            }
        }

        // Remove bullet
        this.#data.bullets.splice(index, 1);
        this.#save();

        return true;
    }

    /**
     * Update bullet metadata (NOT text - that would change hash)
     * 
     * @param {string} id - Bullet ID
     * @param {Object} updates - Updates to apply (tags, parentHeader, etc.)
     * @returns {Object|null} Updated bullet or null if not found
     */
    updateBullet(id, updates) {
        this.#ensureLoaded();

        const bullet = this.#data.bullets.find(b => b.id === id);
        if (!bullet) {
            return null;
        }

        // Allow updating specific fields only (not text/textHash)
        if (updates.tags) bullet.tags = updates.tags;
        if (updates.parentHeader) bullet.parentHeader = { ...bullet.parentHeader, ...updates.parentHeader };

        bullet.updatedAt = new Date().toISOString();
        this.#save();

        return this.#cloneBullet(bullet);
    }

    /**
     * Import bullets from resume markdown
     * Parses bullets and adds them to library with duplicate detection
     * 
     * @param {Array} bullets - Array of parsed bullet objects from bulletParser
     * @param {string} resumeFilename - Source resume filename
     * @returns {Object} Import results with counts
     */
    importBullets(bullets, resumeFilename) {
        this.#ensureLoaded();

        const results = {
            added: 0,
            duplicates: 0,
            errors: 0,
            bullets: []
        };

        for (const bulletData of bullets) {
            try {
                const result = this.addBullet({
                    text: bulletData.text,
                    parentHeader: bulletData.parentHeader,
                    sourceResume: resumeFilename,
                    lineNumber: bulletData.lineNumber
                });

                if (result.success) {
                    results.added++;
                    results.bullets.push(result.bullet);
                } else if (result.duplicate) {
                    results.duplicates++;
                }
            } catch (error) {
                results.errors++;
                console.error(`Error importing bullet: ${error.message}`);
            }
        }

        return results;
    }

    /**
     * Get library statistics
     * 
     * @returns {Object} Statistics object
     */
    getStatistics() {
        this.#ensureLoaded();

        const totalVariants = this.#data.bullets.reduce((sum, b) => sum + b.variants.length, 0);
        const acceptedVariants = this.#data.bullets.reduce(
            (sum, b) => sum + b.variants.filter(v => v.accepted).length,
            0
        );

        return {
            totalBullets: this.#data.bullets.length,
            totalVariants,
            acceptedVariants,
            pendingVariants: totalVariants - acceptedVariants,
            lastUpdated: this.#data.lastUpdated
        };
    }

    /**
     * Ensure library is loaded
     * @private
     */
    #ensureLoaded() {
        if (!this.#loaded || !this.#data) {
            this.load();
        }
    }

    /**
     * Clone bullet object for immutability
     * @private
     */
    #cloneBullet(bullet) {
        return {
            ...bullet,
            source: { ...bullet.source },
            parentHeader: { ...bullet.parentHeader },
            tags: [...bullet.tags],
            variants: bullet.variants.map(v => ({ ...v }))
        };
    }
}

module.exports = BulletLibraryManager;
