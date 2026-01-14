/**
 * Storage Paths Service
 * Singleton service for resolving OS-specific application data paths
 * 
 * SOLID Principles:
 * - Single Responsibility: ONLY handles path resolution
 * - Open/Closed: Extensible via methods, closed for modification
 * - Dependency Inversion: Depends on Electron app abstraction
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class StoragePaths {
    /**
     * Initialize storage paths using Electron's userData directory
     * Automatically resolves to OS-appropriate locations:
     * - Windows: C:\Users\[username]\AppData\Roaming\resume-pdf-exporter\
     * - macOS: ~/Library/Application Support/resume-pdf-exporter/
     * - Linux: ~/.config/resume-pdf-exporter/
     */
    constructor() {
        this.baseDir = app.getPath('userData');
        this.bulletLibraryDir = path.join(this.baseDir, 'bullet-library');
        this.jobPostsDir = path.join(this.baseDir, 'job-posts');
        this.resumeDataDir = path.join(this.baseDir, 'resume-data');
        this.resumeArchiveDir = path.join(this.baseDir, 'resume-archive');
    }

    /**
     * Get path to bullets.json
     * @returns {string} Absolute path to bullets.json
     */
    getBulletsPath() {
        return path.join(this.bulletLibraryDir, 'bullets.json');
    }

    /**
     * Get path to headers.json
     * @returns {string} Absolute path to headers.json
     */
    getHeadersPath() {
        return path.join(this.bulletLibraryDir, 'headers.json');
    }

    /**
     * Get path to validation-hashes.json
     * @returns {string} Absolute path to validation-hashes.json
     */
    getValidationHashesPath() {
        return path.join(this.bulletLibraryDir, 'validation-hashes.json');
    }

    /**
     * Get job-posts directory path
     * @returns {string} Absolute path to job-posts directory
     */
    getJobPostsDir() {
        return this.jobPostsDir;
    }

    /**
     * Get path to job-posts index.json
     * @returns {string} Absolute path to job-posts/index.json
     */
    getJobPostsIndexPath() {
        return path.join(this.jobPostsDir, 'index.json');
    }

    /**
     * Get path to a specific job post markdown file
     * @param {string} filename - The job post filename
     * @returns {string} Absolute path to the job post file
     */
    getJobPostPath(filename) {
        return path.join(this.jobPostsDir, filename);
    }

    /**
     * Get resume-data directory path
     * @returns {string} Absolute path to resume-data directory
     */
    getResumeDataDir() {
        return this.resumeDataDir;
    }

    /**
     * Get resume-archive directory path
     * @returns {string} Absolute path to resume-archive directory
     */
    getResumeArchiveDir() {
        return this.resumeArchiveDir;
    }

    /**
     * Ensure bullet-library directory exists
     * Creates directory if it doesn't exist
     */
    ensureBulletLibraryDir() {
        if (!fs.existsSync(this.bulletLibraryDir)) {
            fs.mkdirSync(this.bulletLibraryDir, { recursive: true });
        }
    }

    /**
     * Ensure job-posts directory exists
     * Creates directory if it doesn't exist
     */
    ensureJobPostsDir() {
        if (!fs.existsSync(this.jobPostsDir)) {
            fs.mkdirSync(this.jobPostsDir, { recursive: true });
        }
    }

    /**
     * Ensure resume-data directory exists
     * Creates directory if it doesn't exist
     */
    ensureResumeDataDir() {
        if (!fs.existsSync(this.resumeDataDir)) {
            fs.mkdirSync(this.resumeDataDir, { recursive: true });
        }
    }

    /**
     * Ensure resume-archive directory exists
     * Creates directory if it doesn't exist
     */
    ensureResumeArchiveDir() {
        if (!fs.existsSync(this.resumeArchiveDir)) {
            fs.mkdirSync(this.resumeArchiveDir, { recursive: true });
        }
    }

    /**
     * Ensure all application directories exist
     * Convenience method to create entire directory structure
     */
    ensureAllDirectories() {
        this.ensureBulletLibraryDir();
        this.ensureJobPostsDir();
        this.ensureResumeDataDir();
        this.ensureResumeArchiveDir();
    }
}

// ============================================
// SINGLETON PATTERN
// Ensures only one instance exists per app lifecycle
// ============================================

/** @type {StoragePaths|null} */
let instance = null;

/**
 * Get or create the singleton StoragePaths instance
 * @returns {StoragePaths} The singleton instance
 */
function getStoragePaths() {
    if (!instance) {
        instance = new StoragePaths();
    }
    return instance;
}

/**
 * Reset the singleton instance (for testing only)
 * @private
 */
function resetInstance() {
    instance = null;
}

module.exports = { StoragePaths, getStoragePaths, resetInstance };
