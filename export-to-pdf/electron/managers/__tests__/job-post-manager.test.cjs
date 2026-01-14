/**
 * JobPostManager Tests
 * Tests for job post markdown file operations
 */
const mockFs = require('mock-fs');
const path = require('path');

// Mock electron before requiring modules
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(() => '/mock/app-data')
    }
}));

describe('JobPostManager', () => {
    let JobPostManager, StoragePaths;
    let manager, paths;

    beforeAll(() => {
        const storageModule = require('../../services/storage-paths.cjs');
        StoragePaths = storageModule.StoragePaths;
        JobPostManager = require('../job-post-manager.cjs');
    });

    beforeEach(() => {
        // Mock file system
        mockFs({
            '/mock/app-data': {
                'bullet-library': {
                    'job-posts': {}
                }
            }
        });

        paths = new StoragePaths();
        manager = new JobPostManager(paths);
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('Constructor', () => {
        it('should throw TypeError if storagePaths not provided', () => {
            expect(() => new JobPostManager(null)).toThrow(TypeError);
        });

        it('should initialize with dependency injection', () => {
            expect(manager).toBeInstanceOf(JobPostManager);
        });
    });

    describe('saveJobPost()', () => {
        it('should save job post with markdown content', () => {
            const markdown = `# Senior Software Engineer at Google\n\nJob description...`;

            const result = manager.saveJobPost(markdown);

            expect(result.success).toBe(true);
            expect(result.filename).toMatch(/senior-software-engineer-at-google-\d{4}-\d{2}-\d{2}\.md/);
            expect(result.title).toBe('Senior Software Engineer at Google');
        });

        it('should extract H1 title from markdown', () => {
            const markdown = `# Full Stack Developer @ Tech Startup\n\nRequirements:\n- 5 years experience`;

            const result = manager.saveJobPost(markdown);

            expect(result.title).toBe('Full Stack Developer @ Tech Startup');
        });

        it('should handle markdown without H1', () => {
            const markdown = `This is a job description without a title.\n\nRequirements listed below.`;

            const result = manager.saveJobPost(markdown);

            expect(result.success).toBe(true);
            expect(result.title).toBe('untitled-job-post');
            expect(result.filename).toMatch(/untitled-job-post-\d{4}-\d{2}-\d{2}\.md/);
        });

        it('should sanitize filename from title', () => {
            const markdown = `# Software Engineer / DevOps @ Company (Remote)\n\nDescription...`;

            const result = manager.saveJobPost(markdown);

            // Should remove special characters
            expect(result.filename).toMatch(/software-engineer-devops-company-remote/);
            expect(result.filename).not.toMatch(/[\/\@\(\)]/);
        });

        it('should append timestamp to filename', () => {
            const markdown = `# Data Scientist\n\nDescription...`;

            const result = manager.saveJobPost(markdown);

            // Should include YYYY-MM-DD format
            expect(result.filename).toMatch(/data-scientist-\d{4}-\d{2}-\d{2}\.md/);
        });

        it('should handle duplicate filenames', () => {
            const markdown = `# Product Manager\n\nDescription...`;

            const result1 = manager.saveJobPost(markdown);
            const result2 = manager.saveJobPost(markdown);

            expect(result1.filename).not.toBe(result2.filename);
            expect(result2.filename).toMatch(/-\d+\.md$/); // Should append counter
        });

        it('should validate markdown is non-empty', () => {
            expect(() => {
                manager.saveJobPost('');
            }).toThrow('Markdown content cannot be empty');

            expect(() => {
                manager.saveJobPost('   \n\n  ');
            }).toThrow('Markdown content cannot be empty');
        });
    });

    describe('getJobPost()', () => {
        it('should retrieve job post by filename', () => {
            const markdown = `# Backend Engineer\n\nResponsibilities...`;

            const saveResult = manager.saveJobPost(markdown);
            const jobPost = manager.getJobPost(saveResult.filename);

            expect(jobPost).toBeDefined();
            expect(jobPost.filename).toBe(saveResult.filename);
            expect(jobPost.title).toBe('Backend Engineer');
            expect(jobPost.content).toBe(markdown);
        });

        it('should return null for non-existent file', () => {
            const jobPost = manager.getJobPost('non-existent-file.md');
            expect(jobPost).toBeNull();
        });

        it('should include file metadata', () => {
            const markdown = `# Frontend Developer\n\nSkills needed...`;

            const saveResult = manager.saveJobPost(markdown);
            const jobPost = manager.getJobPost(saveResult.filename);

            expect(jobPost.createdAt).toBeDefined();
            expect(jobPost.size).toBeGreaterThan(0);
        });
    });

    describe('listJobPosts()', () => {
        it('should return empty array when no job posts', () => {
            const jobPosts = manager.listJobPosts();
            expect(jobPosts).toEqual([]);
        });

        it('should list all job posts', () => {
            manager.saveJobPost(`# Job 1\n\nContent 1`);
            manager.saveJobPost(`# Job 2\n\nContent 2`);
            manager.saveJobPost(`# Job 3\n\nContent 3`);

            const jobPosts = manager.listJobPosts();
            expect(jobPosts.length).toBe(3);
        });

        it('should sort by date descending (newest first)', () => {
            const job1 = manager.saveJobPost(`# Oldest Job\n\nContent`);
            const job2 = manager.saveJobPost(`# Newest Job\n\nContent`);

            const jobPosts = manager.listJobPosts();

            expect(jobPosts[0].filename).toBe(job2.filename);
            expect(jobPosts[1].filename).toBe(job1.filename);
        });

        it('should include summary data for each post', () => {
            manager.saveJobPost(`# UX Designer\n\nDescription...`);

            const jobPosts = manager.listJobPosts();

            expect(jobPosts[0]).toMatchObject({
                filename: expect.any(String),
                title: 'UX Designer',
                createdAt: expect.any(String),
                size: expect.any(Number)
            });
        });
    });

    describe('deleteJobPost()', () => {
        it('should delete job post by filename', () => {
            const markdown = `# QA Engineer\n\nTest requirements...`;

            const saveResult = manager.saveJobPost(markdown);
            const deleteResult = manager.deleteJobPost(saveResult.filename);

            expect(deleteResult).toBe(true);

            const jobPost = manager.getJobPost(saveResult.filename);
            expect(jobPost).toBeNull();
        });

        it('should return false for non-existent file', () => {
            const result = manager.deleteJobPost('non-existent.md');
            expect(result).toBe(false);
        });
    });

    describe('extractJobContext()', () => {
        it('should extract full job context for AI processing', () => {
            const markdown = `# Machine Learning Engineer at AI Corp

## Requirements
- PhD in Computer Science
- 3+ years ML experience

## Responsibilities
- Build neural networks
- Train models

## Benefits
- Competitive salary
- Remote work`;

            const saveResult = manager.saveJobPost(markdown);
            const context = manager.extractJobContext(saveResult.filename);

            expect(context.title).toBe('Machine Learning Engineer at AI Corp');
            expect(context.fullText).toBe(markdown);
            expect(context.sections).toBeDefined();
            expect(context.sections.length).toBeGreaterThan(0);
        });

        it('should parse sections from markdown', () => {
            const markdown = `# Job Title

## Section 1
Content 1

## Section 2
Content 2`;

            const saveResult = manager.saveJobPost(markdown);
            const context = manager.extractJobContext(saveResult.filename);

            expect(context.sections).toHaveLength(2);
            expect(context.sections[0].heading).toBe('Section 1');
            expect(context.sections[0].content).toContain('Content 1');
        });

        it('should return null for non-existent file', () => {
            const context = manager.extractJobContext('non-existent.md');
            expect(context).toBeNull();
        });
    });

    describe('Filename Sanitization', () => {
        it('should handle long titles', () => {
            const longTitle = 'A'.repeat(150);
            const markdown = `# ${longTitle}\n\nContent`;

            const result = manager.saveJobPost(markdown);

            // Filename should be truncated to reasonable length
            expect(result.filename.length).toBeLessThan(120);
        });

        it('should handle titles with multiple spaces', () => {
            const markdown = `# Senior    Software     Engineer\n\nContent`;

            const result = manager.saveJobPost(markdown);

            expect(result.filename).toMatch(/senior-software-engineer/);
            expect(result.filename).not.toMatch(/--/); // No double dashes
        });

        it('should handle titles with unicode characters', () => {
            const markdown = `# Développeur Full-Stack\n\nContent`;

            const result = manager.saveJobPost(markdown);

            // Should convert or remove unicode
            expect(result.filename).toMatch(/developpeur-full-stack/);
        });
    });
});
