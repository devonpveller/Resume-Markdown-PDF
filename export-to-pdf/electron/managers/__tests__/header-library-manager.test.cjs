/**
 * HeaderLibraryManager Tests
 * Tests for header CRUD operations and markdown generation
 */
const mockFs = require('mock-fs');

// Mock electron before requiring modules
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(() => '/mock/app-data')
    }
}));

describe('HeaderLibraryManager', () => {
    let HeaderLibraryManager, StoragePaths, Validation;
    let manager, paths;

    beforeAll(() => {
        const storageModule = require('../../services/storage-paths.cjs');
        StoragePaths = storageModule.StoragePaths;
        Validation = require('../../services/validation.cjs');
        HeaderLibraryManager = require('../header-library-manager.cjs');
    });

    beforeEach(() => {
        // Mock file system
        mockFs({
            '/mock/app-data': {
                'bullet-library': {}
            }
        });

        paths = new StoragePaths();
        manager = new HeaderLibraryManager(paths, Validation);
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('Constructor', () => {
        it('should throw TypeError if storagePaths not provided', () => {
            expect(() => new HeaderLibraryManager(null, Validation)).toThrow(TypeError);
        });

        it('should throw TypeError if validator not provided', () => {
            expect(() => new HeaderLibraryManager(paths, null)).toThrow(TypeError);
        });

        it('should initialize with dependency injection', () => {
            expect(manager).toBeInstanceOf(HeaderLibraryManager);
        });
    });

    describe('load()', () => {
        it('should create empty library on first load', () => {
            manager.load();
            const headers = manager.getAllHeaders();
            expect(headers).toEqual([]);
        });

        it('should initialize with correct structure', () => {
            manager.load();
            expect(() => manager.getAllHeaders()).not.toThrow();
        });
    });

    describe('addHeader()', () => {
        it('should add h2 header', () => {
            const headerData = {
                level: 2,
                text: 'Experience',
                dateRange: null
            };

            const result = manager.addHeader(headerData);

            expect(result.success).toBe(true);
            expect(result.header).toBeDefined();
            expect(result.header.id).toBeDefined();
            expect(result.header.level).toBe(2);
            expect(result.header.text).toBe('Experience');
        });

        it('should add h3 header with parent reference', () => {
            // First add h2 parent
            const h2Result = manager.addHeader({
                level: 2,
                text: 'Experience'
            });

            // Then add h3 child
            const h3Result = manager.addHeader({
                level: 3,
                text: 'Software Engineer, Tech Corp',
                parentHeaderId: h2Result.header.id,
                dateRange: 'Jan 2020 — Present'
            });

            expect(h3Result.success).toBe(true);
            expect(h3Result.header.level).toBe(3);
            expect(h3Result.header.parentHeaderId).toBe(h2Result.header.id);
            expect(h3Result.header.dateRange).toBe('Jan 2020 — Present');
        });

        it('should reject invalid header level', () => {
            expect(() => {
                manager.addHeader({
                    level: 4,
                    text: 'Invalid'
                });
            }).toThrow();
        });

        it('should detect duplicate headers', () => {
            const headerData = {
                level: 2,
                text: 'Experience'
            };

            const result1 = manager.addHeader(headerData);
            expect(result1.success).toBe(true);

            const result2 = manager.addHeader(headerData);
            expect(result2.duplicate).toBe(true);
        });

        it('should increment usage count on duplicate', () => {
            const headerData = {
                level: 2,
                text: 'Experience'
            };

            const result1 = manager.addHeader(headerData);
            const originalUsageCount = result1.header.usageCount;

            manager.addHeader(headerData);

            const header = manager.getHeader(result1.header.id);
            expect(header.usageCount).toBe(originalUsageCount + 1);
        });
    });

    describe('getHeader()', () => {
        it('should return header by ID', () => {
            const headerData = {
                level: 2,
                text: 'Projects'
            };

            const addResult = manager.addHeader(headerData);
            const header = manager.getHeader(addResult.header.id);

            expect(header).toBeDefined();
            expect(header.id).toBe(addResult.header.id);
            expect(header.text).toBe('Projects');
        });

        it('should return null for non-existent ID', () => {
            const header = manager.getHeader('non-existent-id');
            expect(header).toBeNull();
        });

        it('should return immutable copy', () => {
            const headerData = {
                level: 2,
                text: 'Skills'
            };

            const addResult = manager.addHeader(headerData);
            const header1 = manager.getHeader(addResult.header.id);
            const header2 = manager.getHeader(addResult.header.id);

            expect(header1).not.toBe(header2);
            expect(header1).toEqual(header2);
        });
    });

    describe('getSubHeaders()', () => {
        it('should return h3 headers under h2 parent', () => {
            // Add h2 parent
            const h2Result = manager.addHeader({
                level: 2,
                text: 'Experience'
            });

            // Add h3 children
            manager.addHeader({
                level: 3,
                text: 'Job 1',
                parentHeaderId: h2Result.header.id
            });

            manager.addHeader({
                level: 3,
                text: 'Job 2',
                parentHeaderId: h2Result.header.id
            });

            // Add h3 under different parent
            const otherH2 = manager.addHeader({
                level: 2,
                text: 'Projects'
            });

            manager.addHeader({
                level: 3,
                text: 'Project 1',
                parentHeaderId: otherH2.header.id
            });

            const subHeaders = manager.getSubHeaders(h2Result.header.id);
            expect(subHeaders.length).toBe(2);
            expect(subHeaders.every(h => h.parentHeaderId === h2Result.header.id)).toBe(true);
        });

        it('should return empty array if no subheaders', () => {
            const h2Result = manager.addHeader({
                level: 2,
                text: 'Education'
            });

            const subHeaders = manager.getSubHeaders(h2Result.header.id);
            expect(subHeaders).toEqual([]);
        });
    });

    describe('generateMarkdown()', () => {
        it('should generate correct h2 markdown', () => {
            const h2Result = manager.addHeader({
                level: 2,
                text: 'Experience'
            });

            const markdown = manager.generateMarkdown(h2Result.header.id);
            expect(markdown).toBe('## Experience');
        });

        it('should generate h3 markdown with date range', () => {
            const h2Result = manager.addHeader({
                level: 2,
                text: 'Experience'
            });

            const h3Result = manager.addHeader({
                level: 3,
                text: 'Software Engineer, Tech Corp',
                parentHeaderId: h2Result.header.id,
                dateRange: 'Jan 2020 — Present'
            });

            const markdown = manager.generateMarkdown(h3Result.header.id);
            expect(markdown).toContain('### Software Engineer, Tech Corp');
            expect(markdown).toContain('Jan 2020 — Present');
            expect(markdown).toContain('<span class="spacer"></span>');
        });

        it('should generate h3 markdown without date range', () => {
            const h2Result = manager.addHeader({
                level: 2,
                text: 'Experience'
            });

            const h3Result = manager.addHeader({
                level: 3,
                text: 'Volunteer Work',
                parentHeaderId: h2Result.header.id
            });

            const markdown = manager.generateMarkdown(h3Result.header.id);
            expect(markdown).toBe('### Volunteer Work');
            expect(markdown).not.toContain('spacer');
        });

        it('should throw error for non-existent header', () => {
            expect(() => {
                manager.generateMarkdown('non-existent-id');
            }).toThrow();
        });
    });

    describe('deleteHeader()', () => {
        it('should remove header from library', () => {
            const headerData = {
                level: 2,
                text: 'Certifications'
            };

            const addResult = manager.addHeader(headerData);
            const deleteResult = manager.deleteHeader(addResult.header.id);

            expect(deleteResult).toBe(true);

            const header = manager.getHeader(addResult.header.id);
            expect(header).toBeNull();
        });

        it('should return false for non-existent header', () => {
            const result = manager.deleteHeader('non-existent-id');
            expect(result).toBe(false);
        });
    });

    describe('findHeadersByLevel()', () => {
        it('should return only h2 headers', () => {
            manager.addHeader({ level: 2, text: 'Experience' });
            manager.addHeader({ level: 2, text: 'Education' });
            manager.addHeader({ level: 3, text: 'Job Title', parentHeaderId: 'some-id' });

            const h2Headers = manager.findHeadersByLevel(2);
            expect(h2Headers.length).toBe(2);
            expect(h2Headers.every(h => h.level === 2)).toBe(true);
        });

        it('should return only h3 headers', () => {
            const h2 = manager.addHeader({ level: 2, text: 'Experience' });
            manager.addHeader({ level: 3, text: 'Job 1', parentHeaderId: h2.header.id });
            manager.addHeader({ level: 3, text: 'Job 2', parentHeaderId: h2.header.id });

            const h3Headers = manager.findHeadersByLevel(3);
            expect(h3Headers.length).toBe(2);
            expect(h3Headers.every(h => h.level === 3)).toBe(true);
        });
    });

    describe('Persistence', () => {
        it('should save and load library', () => {
            const headerData = {
                level: 2,
                text: 'Persistent Header'
            };

            manager.addHeader(headerData);

            // Create new manager instance
            const newManager = new HeaderLibraryManager(paths, Validation);
            const headers = newManager.getAllHeaders();

            expect(headers.length).toBe(1);
            expect(headers[0].text).toBe('Persistent Header');
        });
    });
});
