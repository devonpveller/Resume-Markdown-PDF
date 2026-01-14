/**
 * StoragePaths Service Tests
 * Tests for OS-specific application data path resolution
 */
const path = require('path');
const mockFs = require('mock-fs');

// Mock electron before requiring StoragePaths
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn((name) => {
            if (name === 'userData') {
                return '/mock/app-data';
            }
            return null;
        })
    }
}));

describe('StoragePaths', () => {
    let StoragePaths, getStoragePaths, resetInstance;

    beforeAll(() => {
        const module = require('../storage-paths.cjs');
        StoragePaths = module.StoragePaths;
        getStoragePaths = module.getStoragePaths;
        resetInstance = module.resetInstance;
    });

    beforeEach(() => {
        // Reset singleton instance before each test
        resetInstance();

        // Mock file system
        mockFs({
            '/mock/app-data': {}
        });
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('Singleton Pattern', () => {
        it('should return same instance on multiple calls', () => {
            const instance1 = getStoragePaths();
            const instance2 = getStoragePaths();
            expect(instance1).toBe(instance2);
        });

        it('should be instance of StoragePaths', () => {
            const instance = getStoragePaths();
            expect(instance).toBeInstanceOf(StoragePaths);
        });
    });

    describe('Path Resolution', () => {
        it('should return correct bullets.json path', () => {
            const paths = getStoragePaths();
            expect(paths.getBulletsPath()).toContain('bullet-library');
            expect(paths.getBulletsPath()).toContain('bullets.json');
        });

        it('should return correct headers.json path', () => {
            const paths = getStoragePaths();
            expect(paths.getHeadersPath()).toContain('bullet-library');
            expect(paths.getHeadersPath()).toContain('headers.json');
        });

        it('should return correct validation-hashes.json path', () => {
            const paths = getStoragePaths();
            expect(paths.getValidationHashesPath()).toContain('bullet-library');
            expect(paths.getValidationHashesPath()).toContain('validation-hashes.json');
        });

        it('should return correct job-posts directory path', () => {
            const paths = getStoragePaths();
            expect(paths.getJobPostsDir()).toContain('job-posts');
        });

        it('should return correct job-posts index path', () => {
            const paths = getStoragePaths();
            expect(paths.getJobPostsIndexPath()).toContain('job-posts');
            expect(paths.getJobPostsIndexPath()).toContain('index.json');
        });
    });

    describe('Directory Creation', () => {
        it('should ensure bullet-library directory exists', () => {
            const paths = getStoragePaths();
            expect(() => paths.ensureBulletLibraryDir()).not.toThrow();
        });

        it('should ensure job-posts directory exists', () => {
            const paths = getStoragePaths();
            expect(() => paths.ensureJobPostsDir()).not.toThrow();
        });
    });
});
