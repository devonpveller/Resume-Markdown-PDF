/**
 * BulletLibraryManager Tests
 * Tests for bullet CRUD operations and variant management
 */
const mockFs = require('mock-fs');
const path = require('path');

// Mock electron before requiring modules
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(() => '/mock/app-data')
    }
}));

describe('BulletLibraryManager', () => {
    let BulletLibraryManager, StoragePaths, Validation;
    let manager, paths;

    beforeAll(() => {
        const storageModule = require('../../services/storage-paths.cjs');
        StoragePaths = storageModule.StoragePaths;
        Validation = require('../../services/validation.cjs');
        BulletLibraryManager = require('../bullet-library-manager.cjs');
    });

    beforeEach(() => {
        // Mock file system
        mockFs({
            '/mock/app-data': {
                'bullet-library': {}
            }
        });

        paths = new StoragePaths();
        manager = new BulletLibraryManager(paths, Validation);
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('Constructor', () => {
        it('should throw TypeError if storagePaths not provided', () => {
            expect(() => new BulletLibraryManager(null, Validation)).toThrow(TypeError);
        });

        it('should throw TypeError if validator not provided', () => {
            expect(() => new BulletLibraryManager(paths, null)).toThrow(TypeError);
        });

        it('should initialize with dependency injection', () => {
            expect(manager).toBeInstanceOf(BulletLibraryManager);
        });
    });

    describe('load()', () => {
        it('should create empty library on first load', () => {
            manager.load();
            const bullets = manager.getAllBullets();
            expect(bullets).toEqual([]);
        });

        it('should initialize with correct structure', () => {
            manager.load();
            // The library should have been created even if empty
            expect(() => manager.getAllBullets()).not.toThrow();
        });
    });

    describe('addBullet()', () => {
        it('should add bullet with generated ID', () => {
            const bulletData = {
                text: 'Engineered LLM-assisted workflow achieving 5.6x faster load times',
                parentHeader: {
                    headerText: 'Experience',
                    headerLevel: 2
                }
            };

            const result = manager.addBullet(bulletData);

            expect(result.success).toBe(true);
            expect(result.bullet).toBeDefined();
            expect(result.bullet.id).toBeDefined();
            expect(result.bullet.text).toBe(bulletData.text);
            expect(result.bullet.textHash).toBeDefined();
            expect(result.bullet.variants).toEqual([]);
        });

        it('should reject empty text', () => {
            const bulletData = {
                text: '',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            };

            expect(() => manager.addBullet(bulletData)).toThrow();
        });

        it('should detect exact duplicates', () => {
            const bulletData = {
                text: 'Engineered LLM-assisted workflow achieving 5.6x faster load times',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            };

            const result1 = manager.addBullet(bulletData);
            expect(result1.success).toBe(true);

            const result2 = manager.addBullet(bulletData);
            expect(result2.duplicate).toBe(true);
            expect(result2.existingId).toBe(result1.bullet.id);
        });

        it('should set source metadata when provided', () => {
            const bulletData = {
                text: 'Architected custom pathfinding',
                parentHeader: { headerText: 'Projects', headerLevel: 2 },
                sourceResume: 'resume-2024-01.md'
            };

            const result = manager.addBullet(bulletData);
            expect(result.bullet.source.resumeFile).toBe('resume-2024-01.md');
        });
    });

    describe('getBullet()', () => {
        it('should return bullet by ID', () => {
            const bulletData = {
                text: 'Implemented multiplayer using NGO supporting 7+ concurrent users',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            };

            const addResult = manager.addBullet(bulletData);
            const bullet = manager.getBullet(addResult.bullet.id);

            expect(bullet).toBeDefined();
            expect(bullet.id).toBe(addResult.bullet.id);
            expect(bullet.text).toBe(bulletData.text);
        });

        it('should return null for non-existent ID', () => {
            const bullet = manager.getBullet('non-existent-id');
            expect(bullet).toBeNull();
        });

        it('should return immutable copy', () => {
            const bulletData = {
                text: 'Test bullet',
                parentHeader: { headerText: 'Test', headerLevel: 2 }
            };

            const addResult = manager.addBullet(bulletData);
            const bullet1 = manager.getBullet(addResult.bullet.id);
            const bullet2 = manager.getBullet(addResult.bullet.id);

            expect(bullet1).not.toBe(bullet2); // Different object references
            expect(bullet1).toEqual(bullet2);  // But same content
        });
    });

    describe('addPendingVariant()', () => {
        it('should add variant to existing bullet', () => {
            const bulletData = {
                text: 'Engineered workflow achieving 5x faster performance',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            };

            const bulletResult = manager.addBullet(bulletData);

            const variantResult = manager.addPendingVariant({
                bulletId: bulletResult.bullet.id,
                text: 'Developed high-performance workflow resulting in 5x speed improvement',
                source: 'ai-rephrase',
                model: 'llama-3.1-8b',
                jobPostRef: 'job-123'
            });

            expect(variantResult.success).toBe(true);
            expect(variantResult.variant).toBeDefined();
            expect(variantResult.variant.accepted).toBe(false);
            expect(variantResult.variant.jobPostRef).toBe('job-123');

            const bullet = manager.getBullet(bulletResult.bullet.id);
            expect(bullet.variants.length).toBe(1);
            expect(bullet.variants[0].accepted).toBe(false);
        });

        it('should reject variant for non-existent bullet', () => {
            expect(() => {
                manager.addPendingVariant({
                    bulletId: 'non-existent',
                    text: 'Variant text',
                    source: 'ai-rephrase'
                });
            }).toThrow();
        });
    });

    describe('acceptVariant()', () => {
        it('should mark variant as accepted and register hash', () => {
            const bulletData = {
                text: 'Original bullet text',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            };

            const bulletResult = manager.addBullet(bulletData);

            const variantResult = manager.addPendingVariant({
                bulletId: bulletResult.bullet.id,
                text: 'Rephrased variant text',
                source: 'ai-rephrase'
            });

            const acceptResult = manager.acceptVariant(bulletResult.bullet.id, variantResult.variant.id);

            expect(acceptResult.success).toBe(true);
            expect(acceptResult.variant.accepted).toBe(true);
            expect(acceptResult.variant.acceptedAt).toBeDefined();

            // Variant hash should now be registered
            const bullet = manager.getBullet(bulletResult.bullet.id);
            const acceptedVariant = bullet.variants.find(v => v.id === variantResult.variant.id);
            expect(acceptedVariant.accepted).toBe(true);
        });

        it('should reject duplicate variants', () => {
            const bulletData = {
                text: 'Original bullet',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            };

            const bulletResult = manager.addBullet(bulletData);

            // Add and accept first variant
            const variant1 = manager.addPendingVariant({
                bulletId: bulletResult.bullet.id,
                text: 'Same variant text',
                source: 'ai-rephrase'
            });
            manager.acceptVariant(bulletResult.bullet.id, variant1.variant.id);

            // Try to add duplicate variant
            const variant2Result = manager.addPendingVariant({
                bulletId: bulletResult.bullet.id,
                text: 'Same variant text',
                source: 'ai-rephrase'
            });

            expect(variant2Result.duplicate).toBe(true);
        });
    });

    describe('rejectVariant()', () => {
        it('should remove variant from bullet', () => {
            const bulletData = {
                text: 'Original bullet',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            };

            const bulletResult = manager.addBullet(bulletData);

            const variantResult = manager.addPendingVariant({
                bulletId: bulletResult.bullet.id,
                text: 'Variant to reject',
                source: 'ai-rephrase'
            });

            const rejectResult = manager.rejectVariant(bulletResult.bullet.id, variantResult.variant.id);

            expect(rejectResult.success).toBe(true);

            const bullet = manager.getBullet(bulletResult.bullet.id);
            expect(bullet.variants.length).toBe(0);
        });
    });

    describe('deleteBullet()', () => {
        it('should remove bullet from library', () => {
            const bulletData = {
                text: 'Bullet to delete',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            };

            const addResult = manager.addBullet(bulletData);
            const deleteResult = manager.deleteBullet(addResult.bullet.id);

            expect(deleteResult).toBe(true);

            const bullet = manager.getBullet(addResult.bullet.id);
            expect(bullet).toBeNull();
        });

        it('should return false for non-existent bullet', () => {
            const result = manager.deleteBullet('non-existent-id');
            expect(result).toBe(false);
        });
    });

    describe('findBulletsBySection()', () => {
        it('should return bullets filtered by section header', () => {
            manager.addBullet({
                text: 'Experience bullet 1',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            });

            manager.addBullet({
                text: 'Experience bullet 2',
                parentHeader: { headerText: 'Developer, Company', headerLevel: 3, sectionHeader: 'Experience' }
            });

            manager.addBullet({
                text: 'Projects bullet 1',
                parentHeader: { headerText: 'Projects', headerLevel: 2 }
            });

            const experienceBullets = manager.findBulletsBySection('Experience');
            expect(experienceBullets.length).toBe(2);

            const projectsBullets = manager.findBulletsBySection('Projects');
            expect(projectsBullets.length).toBe(1);
        });
    });

    describe('Persistence', () => {
        it('should save and load library', () => {
            const bulletData = {
                text: 'Persistent bullet',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            };

            manager.addBullet(bulletData);

            // Create new manager instance
            const newManager = new BulletLibraryManager(paths, Validation);
            const bullets = newManager.getAllBullets();

            expect(bullets.length).toBe(1);
            expect(bullets[0].text).toBe(bulletData.text);
        });
    });
});
