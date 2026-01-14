/**
 * Validation Service Tests
 * Tests for text validation, hashing, and duplicate detection
 */

describe('Validation', () => {
    let Validation;

    beforeAll(() => {
        Validation = require('../validation.cjs');
    });

    describe('generateHash()', () => {
        it('should generate consistent hash for same text', () => {
            const text = 'Engineered LLM-assisted workflow';
            const hash1 = Validation.generateHash(text);
            const hash2 = Validation.generateHash(text);
            expect(hash1).toBe(hash2);
        });

        it('should generate different hashes for different text', () => {
            const text1 = 'Engineered LLM-assisted workflow';
            const text2 = 'Architected custom pathfinding';
            const hash1 = Validation.generateHash(text1);
            const hash2 = Validation.generateHash(text2);
            expect(hash1).not.toBe(hash2);
        });

        it('should ignore case differences', () => {
            const text1 = 'Engineered Workflow';
            const text2 = 'engineered workflow';
            const hash1 = Validation.generateHash(text1);
            const hash2 = Validation.generateHash(text2);
            expect(hash1).toBe(hash2);
        });

        it('should ignore whitespace differences', () => {
            const text1 = 'Engineered   workflow';
            const text2 = 'Engineered workflow';
            const hash1 = Validation.generateHash(text1);
            const hash2 = Validation.generateHash(text2);
            expect(hash1).toBe(hash2);
        });
    });

    describe('levenshteinDistance()', () => {
        it('should return 0 for identical strings', () => {
            const distance = Validation.levenshteinDistance('hello', 'hello');
            expect(distance).toBe(0);
        });

        it('should return correct distance for single character difference', () => {
            const distance = Validation.levenshteinDistance('hello', 'hallo');
            expect(distance).toBe(1);
        });

        it('should return correct distance for completely different strings', () => {
            const distance = Validation.levenshteinDistance('abc', 'xyz');
            expect(distance).toBe(3);
        });

        it('should handle empty strings', () => {
            expect(Validation.levenshteinDistance('', 'test')).toBe(4);
            expect(Validation.levenshteinDistance('test', '')).toBe(4);
            expect(Validation.levenshteinDistance('', '')).toBe(0);
        });
    });

    describe('calculateSimilarity()', () => {
        it('should return 1.0 for identical strings', () => {
            const similarity = Validation.calculateSimilarity('hello world', 'hello world');
            expect(similarity).toBe(1.0);
        });

        it('should return 0.0 for completely different strings', () => {
            const similarity = Validation.calculateSimilarity('abc', 'xyz');
            expect(similarity).toBeLessThan(0.1);
        });

        it('should return value between 0 and 1 for similar strings', () => {
            const similarity = Validation.calculateSimilarity('hello world', 'hello word');
            expect(similarity).toBeGreaterThan(0.8);
            expect(similarity).toBeLessThan(1.0);
        });

        it('should be case-insensitive', () => {
            const similarity = Validation.calculateSimilarity('Hello World', 'hello world');
            expect(similarity).toBe(1.0);
        });
    });

    describe('validateBullet()', () => {
        it('should pass for well-formed STAR bullet', () => {
            const bullet = 'Engineered LLM-assisted workflow achieving 5.6x faster load times and 25x performance improvements, reducing development time by 25%.';
            const validation = Validation.validateBullet(bullet);
            expect(validation.isValid).toBe(true);
            expect(validation.hasStrongVerb).toBe(true);
            expect(validation.hasMetrics).toBe(true);
            expect(validation.meetsMinLength).toBe(true);
        });

        it('should fail for bullets without strong verbs', () => {
            const bullet = 'Worked on a project that helped with performance by 25%.';
            const validation = Validation.validateBullet(bullet);
            expect(validation.hasStrongVerb).toBe(false);
        });

        it('should fail for bullets without metrics', () => {
            const bullet = 'Engineered a new workflow for the team.';
            const validation = Validation.validateBullet(bullet);
            expect(validation.hasMetrics).toBe(false);
        });

        it('should fail for bullets that are too short', () => {
            const bullet = 'Built app';
            const validation = Validation.validateBullet(bullet);
            expect(validation.meetsMinLength).toBe(false);
        });

        it('should provide quality score', () => {
            const bullet = 'Engineered LLM-assisted workflow achieving 5.6x faster load times.';
            const validation = Validation.validateBullet(bullet);
            expect(validation.qualityScore).toBeGreaterThan(0);
            expect(validation.qualityScore).toBeLessThanOrEqual(100);
        });
    });

    describe('findSimilarBullets()', () => {
        const existingBullets = [
            {
                id: '1',
                text: 'Engineered LLM-assisted workflow achieving 5.6x faster load times',
                textHash: 'hash1'
            },
            {
                id: '2',
                text: 'Architected custom pathfinding operating at 1.3ms average',
                textHash: 'hash2'
            },
            {
                id: '3',
                text: 'Implemented multiplayer using NGO supporting 7+ concurrent users',
                textHash: 'hash3'
            }
        ];

        it('should find exact duplicates', () => {
            const text = 'Engineered LLM-assisted workflow achieving 5.6x faster load times';
            const similar = Validation.findSimilarBullets(text, existingBullets, 0.9);
            expect(similar.length).toBeGreaterThan(0);
            expect(similar[0].similarity).toBe(1.0);
        });

        it('should find similar bullets above threshold', () => {
            const text = 'Engineered LLM workflow achieving 6x faster load times';
            const similar = Validation.findSimilarBullets(text, existingBullets, 0.7);
            expect(similar.length).toBeGreaterThan(0);
            expect(similar[0].similarity).toBeGreaterThan(0.7);
        });

        it('should not return bullets below threshold', () => {
            const text = 'Completely different bullet about database optimization';
            const similar = Validation.findSimilarBullets(text, existingBullets, 0.9);
            expect(similar.length).toBe(0);
        });

        it('should return bullets sorted by similarity descending', () => {
            const text = 'Engineered workflow achieving faster times';
            const similar = Validation.findSimilarBullets(text, existingBullets, 0.3);
            if (similar.length > 1) {
                for (let i = 0; i < similar.length - 1; i++) {
                    expect(similar[i].similarity).toBeGreaterThanOrEqual(similar[i + 1].similarity);
                }
            }
        });
    });

    describe('checkExactDuplicate()', () => {
        it('should detect exact duplicate', () => {
            const existingBullets = [
                { id: '1', text: 'Test bullet one', textHash: Validation.generateHash('Test bullet one') },
                { id: '2', text: 'Test bullet two', textHash: Validation.generateHash('Test bullet two') }
            ];

            const result = Validation.checkExactDuplicate('Test bullet one', existingBullets);
            expect(result.isDuplicate).toBe(true);
            expect(result.existingId).toBe('1');
        });

        it('should detect duplicate with different whitespace/case', () => {
            const existingBullets = [
                { id: '1', text: 'Test bullet one', textHash: Validation.generateHash('Test bullet one') },
                { id: '2', text: 'Test bullet two', textHash: Validation.generateHash('Test bullet two') }
            ];

            const result = Validation.checkExactDuplicate('  TEST  BULLET  ONE  ', existingBullets);
            expect(result.isDuplicate).toBe(true);
            expect(result.existingId).toBe('1');
        });

        it('should not flag non-duplicates', () => {
            const existingBullets = [
                { id: '1', text: 'Test bullet one', textHash: Validation.generateHash('Test bullet one') },
                { id: '2', text: 'Test bullet two', textHash: Validation.generateHash('Test bullet two') }
            ];

            const result = Validation.checkExactDuplicate('Completely different text', existingBullets);
            expect(result.isDuplicate).toBe(false);
            expect(result.existingId).toBeNull();
        });
    });
});
