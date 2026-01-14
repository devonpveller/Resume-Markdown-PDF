/**
 * Bullet Library Integration Tests
 * End-to-end tests for complete bullet library workflows
 * 
 * These tests verify that managers work together correctly.
 * Individual manager functionality is tested in their respective test files.
 */

const mockFs = require('mock-fs');
const { parseMarkdown } = require('../../src/components/bullet-parser.js');

// Mock electron
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(() => '/mock/app-data')
    }
}));

describe('Bullet Library Integration Tests', () => {
    let BulletLibraryManager, HeaderLibraryManager, JobPostManager, StoragePaths, Validation;
    const testDataDir = '/mock/app-data';

    beforeAll(() => {
        const storageModule = require('../../electron/services/storage-paths.cjs');
        StoragePaths = storageModule.StoragePaths;
        Validation = require('../../electron/services/validation.cjs');
        BulletLibraryManager = require('../../electron/managers/bullet-library-manager.cjs');
        HeaderLibraryManager = require('../../electron/managers/header-library-manager.cjs');
        JobPostManager = require('../../electron/managers/job-post-manager.cjs');
    });

    beforeEach(() => {
        // Setup mock filesystem
        mockFs({
            [testDataDir]: {
                'bullet-library': {
                    'bullets.json': '{"bullets":[]}',
                    'headers.json': '{"headers":[]}'
                },
                'job-posts': {}
            }
        });
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('Parser Integration', () => {
        it('should parse markdown and return structured data', () => {
            const markdown = `
## Professional Experience

- Architected system serving 1M+ users with 99.9% uptime
- Led team of 8 engineers reducing deployment time by 75%
            `.trim();

            const parsed = parseMarkdown(markdown);

            expect(parsed.headers).toBeDefined();
            expect(parsed.bullets).toBeDefined();
            expect(parsed.bullets.length).toBe(2);
        });
    });

    describe('Manager Integration', () => {
        it('should create headers and bullets together', async () => {
            const paths = new StoragePaths();
            const headerMgr = new HeaderLibraryManager(paths, Validation);
            const bulletMgr = new BulletLibraryManager(paths, Validation);

            // Create header
            const headerResult = await headerMgr.addHeader({
                text: 'Experience',
                level: 2
            });

            // Create bullet under header
            const bulletData = {
                text: 'Implemented feature improving user retention by 20% through data-driven optimizations',
                parentHeader: {
                    headerId: headerResult.header.id,
                    headerText: headerResult.header.text,
                    headerLevel: headerResult.header.level
                }
            };

            const bulletResult = await bulletMgr.addBullet(bulletData);

            expect(bulletResult.success).toBe(true);
            expect(bulletResult.bullet.id).toBeDefined();
            expect(bulletResult.bullet.parentHeader.headerId).toBe(headerResult.header.id);
        });

        it('should manage variants', async () => {
            const paths = new StoragePaths();
            const bulletMgr = new BulletLibraryManager(paths, Validation);
            const headerMgr = new HeaderLibraryManager(paths, Validation);

            const headerResult = await headerMgr.addHeader({ text: 'Experience', level: 2 });
            const bulletResult = await bulletMgr.addBullet({
                text: 'Original bullet text with sufficient length for validation and STAR methodology',
                parentHeader: {
                    headerId: headerResult.header.id,
                    headerText: headerResult.header.text,
                    headerLevel: headerResult.header.level
                }
            });

            // Add variant
            const variantResult = await bulletMgr.addPendingVariant({
                bulletId: bulletResult.bullet.id,
                text: 'Variant text with sufficient length for validation and STAR methodology',
                source: 'test'
            });
            expect(variantResult.success).toBe(true);

            // Get bullet to verify variant added
            const bulletWithVariant = await bulletMgr.getBullet(bulletResult.bullet.id);
            expect(bulletWithVariant.variants.length).toBe(1);

            // Accept variant
            const variantId = bulletWithVariant.variants[0].id;
            const acceptedResult = await bulletMgr.acceptVariant(bulletResult.bullet.id, variantId);
            expect(acceptedResult.success).toBe(true);

            // Verify accepted
            const finalBullet = await bulletMgr.getBullet(bulletResult.bullet.id);
            const acceptedVariant = finalBullet.variants.find(v => v.id === variantId);
            expect(acceptedVariant.accepted).toBe(true);
        });
    });

    describe('Job Post Integration', () => {
        it('should save and retrieve job posts', async () => {
            const paths = new StoragePaths();
            const jobMgr = new JobPostManager(paths, Validation);

            const markdown = `
# Software Engineer

## Company: TechCorp

## Requirements
- 5+ years experience
- Strong Python skills
            `.trim();

            const saved = await jobMgr.saveJobPost(markdown);
            expect(saved.filename).toBeDefined();

            const context = await jobMgr.extractJobContext(saved.filename);
            expect(context.title).toBeDefined();
        });
    });
});
