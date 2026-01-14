/**
 * Preload API Tests
 * Tests for context bridge API exposure
 */

// Mock electron before requiring modules
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(() => '/mock/app-data')
    },
    ipcMain: {
        handle: jest.fn()
    },
    contextBridge: {
        exposeInMainWorld: jest.fn((name, api) => {
            global.window = global.window || {};
            global.window[name] = api;
        })
    },
    ipcRenderer: {
        invoke: jest.fn((channel, ...args) => Promise.resolve({ success: true, data: {} }))
    }
}));

describe('Preload API', () => {
    let preloadAPI;

    beforeAll(() => {
        // Clear window object
        global.window = {};

        // Require preload script which will execute and expose API
        require('../preload.js');

        preloadAPI = global.window.bulletLibrary;
    });

    describe('API Exposure', () => {
        it('should expose bulletLibrary API to window', () => {
            expect(preloadAPI).toBeDefined();
        });

        it('should expose bullet operations', () => {
            expect(typeof preloadAPI.addBullet).toBe('function');
            expect(typeof preloadAPI.getBullet).toBe('function');
            expect(typeof preloadAPI.getAllBullets).toBe('function');
            expect(typeof preloadAPI.deleteBullet).toBe('function');
            expect(typeof preloadAPI.addBulletVariant).toBe('function');
            expect(typeof preloadAPI.acceptVariant).toBe('function');
            expect(typeof preloadAPI.rejectVariant).toBe('function');
        });

        it('should expose header operations', () => {
            expect(typeof preloadAPI.addHeader).toBe('function');
            expect(typeof preloadAPI.getHeader).toBe('function');
            expect(typeof preloadAPI.getAllHeaders).toBe('function');
            expect(typeof preloadAPI.deleteHeader).toBe('function');
            expect(typeof preloadAPI.getSubHeaders).toBe('function');
            expect(typeof preloadAPI.generateHeaderMarkdown).toBe('function');
        });

        it('should expose job post operations', () => {
            expect(typeof preloadAPI.saveJobPost).toBe('function');
            expect(typeof preloadAPI.getJobPost).toBe('function');
            expect(typeof preloadAPI.listJobPosts).toBe('function');
            expect(typeof preloadAPI.deleteJobPost).toBe('function');
            expect(typeof preloadAPI.extractJobContext).toBe('function');
        });
    });

    describe('TypeScript Definitions', () => {
        it('should have all methods documented for TypeScript', () => {
            const expectedMethods = [
                'addBullet', 'getBullet', 'getAllBullets', 'deleteBullet',
                'addBulletVariant', 'acceptVariant', 'rejectVariant',
                'addHeader', 'getHeader', 'getAllHeaders', 'deleteHeader',
                'getSubHeaders', 'generateHeaderMarkdown',
                'saveJobPost', 'getJobPost', 'listJobPosts', 'deleteJobPost',
                'extractJobContext'
            ];

            expectedMethods.forEach(method => {
                expect(preloadAPI[method]).toBeDefined();
            });
        });
    });
});
