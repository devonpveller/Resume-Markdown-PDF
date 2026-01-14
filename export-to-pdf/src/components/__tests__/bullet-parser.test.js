/**
 * bulletParser.js Tests
 * Tests for parsing markdown resume content into structured bullet/header data
 */

describe('bulletParser', () => {
    let bulletParser;

    beforeAll(() => {
        bulletParser = require('../bullet-parser.js');
    });

    describe('parseMarkdown()', () => {
        it('should extract h2 headers', () => {
            const markdown = `
## Experience
## Education
## Skills
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.headers.length).toBe(3);
            expect(result.headers[0].level).toBe(2);
            expect(result.headers[0].text).toBe('Experience');
            expect(result.headers[1].text).toBe('Education');
        });

        it('should extract h3 headers with date ranges', () => {
            const markdown = `
### Software Engineer, Tech Corp <span class="spacer"></span> Jan 2020 — Present
### Senior Developer, Startup Inc <span class="spacer"></span> Jan 2018 — Dec 2019
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.headers.length).toBe(2);
            expect(result.headers[0].level).toBe(3);
            expect(result.headers[0].text).toBe('Software Engineer, Tech Corp');
            expect(result.headers[0].dateRange).toBe('Jan 2020 — Present');
            expect(result.headers[1].dateRange).toBe('Jan 2018 — Dec 2019');
        });

        it('should extract h3 headers without date ranges', () => {
            const markdown = `
### Technologies
### Overview
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.headers.length).toBe(2);
            expect(result.headers[0].text).toBe('Technologies');
            expect(result.headers[0].dateRange).toBeNull();
        });

        it('should extract bullet points', () => {
            const markdown = `
## Experience

### Software Engineer

- Implemented REST API
- Built React frontend
- Deployed to AWS
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.bullets.length).toBe(3);
            expect(result.bullets[0].text).toBe('Implemented REST API');
            expect(result.bullets[1].text).toBe('Built React frontend');
            expect(result.bullets[2].text).toBe('Deployed to AWS');
        });

        it('should associate bullets with parent h3 header', () => {
            const markdown = `
### Job Title

- Bullet 1
- Bullet 2

### Another Job

- Bullet 3
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.bullets[0].parentHeaderId).toBeDefined();
            expect(result.bullets[0].parentHeaderId).toBe(result.headers[0].id);
            expect(result.bullets[1].parentHeaderId).toBe(result.headers[0].id);
            expect(result.bullets[2].parentHeaderId).toBe(result.headers[1].id);
        });

        it('should associate h3 with parent h2', () => {
            const markdown = `
## Experience

### Job 1
### Job 2

## Education

### Degree 1
`;

            const result = bulletParser.parseMarkdown(markdown);

            const h2Experience = result.headers.find(h => h.text === 'Experience');
            const h2Education = result.headers.find(h => h.text === 'Education');
            const h3Job1 = result.headers.find(h => h.text === 'Job 1');
            const h3Job2 = result.headers.find(h => h.text === 'Job 2');
            const h3Degree1 = result.headers.find(h => h.text === 'Degree 1');

            expect(h3Job1.parentHeaderId).toBe(h2Experience.id);
            expect(h3Job2.parentHeaderId).toBe(h2Experience.id);
            expect(h3Degree1.parentHeaderId).toBe(h2Education.id);
        });

        it('should handle nested bullets', () => {
            const markdown = `
- Parent bullet
  - Nested child 1
  - Nested child 2
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.bullets.length).toBe(3);
            expect(result.bullets[0].text).toBe('Parent bullet');
            expect(result.bullets[1].text).toBe('Nested child 1');
            expect(result.bullets[1].nestedLevel).toBe(1);
            expect(result.bullets[2].nestedLevel).toBe(1);
        });

        it('should clean HTML tags from text', () => {
            const markdown = `
- Implemented <strong>real-time</strong> features
- Built <em>responsive</em> UI
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.bullets[0].text).toBe('Implemented real-time features');
            expect(result.bullets[1].text).toBe('Built responsive UI');
        });

        it('should preserve markdown links', () => {
            const markdown = `
- See [documentation](https://example.com) for details
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.bullets[0].text).toContain('[documentation]');
            expect(result.bullets[0].text).toContain('(https://example.com)');
        });

        it('should handle empty markdown', () => {
            const result = bulletParser.parseMarkdown('');

            expect(result.headers).toEqual([]);
            expect(result.bullets).toEqual([]);
        });

        it('should handle markdown with no bullets', () => {
            const markdown = `
## Experience
## Education
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.headers.length).toBe(2);
            expect(result.bullets).toEqual([]);
        });

        it('should handle markdown with no headers', () => {
            const markdown = `
- Bullet 1
- Bullet 2
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.bullets.length).toBe(2);
            expect(result.bullets[0].parentHeaderId).toBeNull();
        });

        it('should preserve line breaks in bullets', () => {
            const markdown = `
- Multi-line bullet
  with continuation
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.bullets[0].text).toContain('Multi-line bullet');
            expect(result.bullets[0].text).toContain('with continuation');
        });

        it('should handle bullets with inline code', () => {
            const markdown = `
- Used \`React\` and \`TypeScript\`
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.bullets[0].text).toContain('`React`');
            expect(result.bullets[0].text).toContain('`TypeScript`');
        });

        it('should detect STAR method compliance', () => {
            const starBullet = `Achieved 50% performance improvement by optimizing database queries`;
            const nonStarBullet = `Worked on various projects`;

            const markdown = `
- ${starBullet}
- ${nonStarBullet}
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.bullets[0].isStarMethod).toBe(true);
            expect(result.bullets[1].isStarMethod).toBe(false);
        });

        it('should extract section context for bullets', () => {
            const markdown = `
## Experience

### Software Engineer, Google

- Bullet 1
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.bullets[0].sectionContext).toBeDefined();
            expect(result.bullets[0].sectionContext.h2Text).toBe('Experience');
            expect(result.bullets[0].sectionContext.h3Text).toBe('Software Engineer, Google');
        });

        it('should handle mixed content (paragraphs and bullets)', () => {
            const markdown = `
## Summary

This is a paragraph of text.

## Experience

### Job Title

Some description here.

- Bullet 1
- Bullet 2

Another paragraph.
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.headers.length).toBe(3); // Summary, Experience, Job Title
            expect(result.bullets.length).toBe(2); // Only bullets, not paragraphs
        });

        it('should assign IDs to all parsed entities', () => {
            const markdown = `
## Experience

- Bullet 1
`;

            const result = bulletParser.parseMarkdown(markdown);

            expect(result.headers[0].id).toBeDefined();
            expect(result.bullets[0].id).toBeDefined();
            expect(typeof result.headers[0].id).toBe('string');
            expect(typeof result.bullets[0].id).toBe('string');
        });

        it('should handle complex real-world resume structure', () => {
            const markdown = `
## Professional Experience

### Senior Software Engineer, Tech Company <span class="spacer"></span> Jan 2020 — Present

- Engineered LLM-assisted workflow achieving 5.6x faster load times
- Architected custom pathfinding operating at 1.3ms average
- Implemented multiplayer using NGO supporting 7+ concurrent users

**Technologies:** Unity, C#, OpenXR

### Full Stack Developer, Startup Inc <span class="spacer"></span> Jan 2018 — Dec 2019

- Built REST API with Node.js and Express
- Designed responsive UI with React

## Education

### B.S. Computer Science, University <span class="spacer"></span> 2014 — 2018
`;

            const result = bulletParser.parseMarkdown(markdown);

            // Verify structure
            expect(result.headers.length).toBe(5); // 2 h2 + 3 h3
            expect(result.bullets.length).toBe(5);

            // Verify h2 headers
            const h2Headers = result.headers.filter(h => h.level === 2);
            expect(h2Headers.length).toBe(2);

            // Verify h3 headers
            const h3Headers = result.headers.filter(h => h.level === 3);
            expect(h3Headers.length).toBe(3);
            expect(h3Headers[0].dateRange).toBe('Jan 2020 — Present');

            // Verify bullet association
            const firstJobBullets = result.bullets.filter(b =>
                b.sectionContext?.h3Text === 'Senior Software Engineer, Tech Company'
            );
            expect(firstJobBullets.length).toBe(3);
        });
    });
});
