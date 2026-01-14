/**
 * IPC Handlers
 * 
 * Electron IPC orchestration layer connecting React frontend to backend managers.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles IPC communication (no business logic)
 * - Open/Closed: Easy to add new handlers
 * - Liskov Substitution: Uses abstracted manager interfaces
 * - Interface Segregation: Thin wrapper around managers
 * - Dependency Inversion: Depends on manager abstractions
 * 
 * Design Patterns:
 * - Facade Pattern: Simplifies access to complex manager subsystem
 * - Factory Pattern: Creates manager instances
 * - Response Shaping: Standardized {success, data, error} format
 */

const { ipcMain } = require('electron');
const { StoragePaths } = require('./services/storage-paths.cjs');
const Validation = require('./services/validation.cjs');
const BulletLibraryManager = require('./managers/bullet-library-manager.cjs');
const HeaderLibraryManager = require('./managers/header-library-manager.cjs');
const JobPostManager = require('./managers/job-post-manager.cjs');

// Singleton manager instances
let bulletManager = null;
let headerManager = null;
let jobPostManager = null;

/**
 * Initialize manager instances
 * @private
 */
function initializeManagers() {
    if (!bulletManager) {
        const paths = new StoragePaths();
        bulletManager = new BulletLibraryManager(paths, Validation);
        headerManager = new HeaderLibraryManager(paths, Validation);
        jobPostManager = new JobPostManager(paths);
    }
}

/**
 * Reset manager instances (for testing)
 * @private
 */
function resetManagers() {
    bulletManager = null;
    headerManager = null;
    jobPostManager = null;
}

/**
 * Wrap response in standardized format
 * @param {*} data - Data to wrap
 * @returns {Object} Standardized response
 * @private
 */
function successResponse(data) {
    return {
        success: true,
        data,
        error: null
    };
}

/**
 * Wrap error in standardized format
 * @param {Error|string} error - Error to wrap
 * @returns {Object} Standardized error response
 * @private
 */
function errorResponse(error) {
    return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : error
    };
}

/**
 * Register all IPC handlers
 */
function registerHandlers() {
    initializeManagers();

    // ============ Bullet Handlers ============

    ipcMain.handle('bullet:add', async (event, bulletData) => {
        try {
            const result = bulletManager.addBullet(bulletData);
            return successResponse({ bullet: result.bullet });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('bullet:get', async (event, bulletId) => {
        try {
            const bullet = bulletManager.getBullet(bulletId);
            if (!bullet) {
                return errorResponse('Bullet not found');
            }
            return successResponse({ bullet });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('bullet:getAll', async () => {
        try {
            const bullets = bulletManager.getAllBullets();
            return successResponse({ bullets });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('bullet:delete', async (event, bulletId) => {
        try {
            const deleted = bulletManager.deleteBullet(bulletId);
            if (!deleted) {
                return errorResponse('Bullet not found');
            }
            return successResponse({ deleted: true });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('bullet:addVariant', async (event, bulletId, variantText) => {
        try {
            const result = bulletManager.addPendingVariant(bulletId, variantText);
            return successResponse({ variant: result.variant });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('bullet:acceptVariant', async (event, bulletId, variantId) => {
        try {
            const result = bulletManager.acceptVariant(bulletId, variantId);
            return successResponse(result);
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('bullet:rejectVariant', async (event, bulletId, variantId) => {
        try {
            const result = bulletManager.rejectVariant(bulletId, variantId);
            return successResponse(result);
        } catch (error) {
            return errorResponse(error);
        }
    });

    // ============ Header Handlers ============

    ipcMain.handle('header:add', async (event, headerData) => {
        try {
            const result = headerManager.addHeader(headerData);
            return successResponse({ header: result.header });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('header:get', async (event, headerId) => {
        try {
            const header = headerManager.getHeader(headerId);
            if (!header) {
                return errorResponse('Header not found');
            }
            return successResponse({ header });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('header:getAll', async () => {
        try {
            const headers = headerManager.getAllHeaders();
            return successResponse({ headers });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('header:delete', async (event, headerId) => {
        try {
            const deleted = headerManager.deleteHeader(headerId);
            if (!deleted) {
                return errorResponse('Header not found');
            }
            return successResponse({ deleted: true });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('header:getSubHeaders', async (event, parentHeaderId) => {
        try {
            const headers = headerManager.getSubHeaders(parentHeaderId);
            return successResponse({ headers });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('header:generateMarkdown', async (event, headerId) => {
        try {
            const markdown = headerManager.generateMarkdown(headerId);
            return successResponse({ markdown });
        } catch (error) {
            return errorResponse(error);
        }
    });

    // ============ JobPost Handlers ============

    ipcMain.handle('jobPost:save', async (event, markdown) => {
        try {
            const result = jobPostManager.saveJobPost(markdown);
            return successResponse(result);
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('jobPost:get', async (event, filename) => {
        try {
            const jobPost = jobPostManager.getJobPost(filename);
            if (!jobPost) {
                return errorResponse('Job post not found');
            }
            return successResponse({ jobPost });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('jobPost:list', async () => {
        try {
            const jobPosts = jobPostManager.listJobPosts();
            return successResponse({ jobPosts });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('jobPost:delete', async (event, filename) => {
        try {
            const deleted = jobPostManager.deleteJobPost(filename);
            if (!deleted) {
                return errorResponse('Job post not found');
            }
            return successResponse({ deleted: true });
        } catch (error) {
            return errorResponse(error);
        }
    });

    ipcMain.handle('jobPost:extractContext', async (event, filename) => {
        try {
            const context = jobPostManager.extractJobContext(filename);
            if (!context) {
                return errorResponse('Job post not found');
            }
            return successResponse({ context });
        } catch (error) {
            return errorResponse(error);
        }
    });
}

module.exports = {
    registerHandlers,
    resetManagers // Export for testing
};
