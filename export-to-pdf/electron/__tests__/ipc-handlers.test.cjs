/**
 * IPC Handlers Tests
 * Tests for Electron IPC orchestration layer
 */
const mockFs = require('mock-fs');

// Mock electron before requiring modules
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(() => '/mock/app-data')
    },
    ipcMain: {
        handle: jest.fn()
    }
}));

describe('IPC Handlers', () => {
    let ipcHandlers;
    let { ipcMain } = require('electron');

    beforeAll(() => {
        // Require module before mock-fs to avoid ENOENT
        ipcHandlers = require('../ipc-handlers.cjs');
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset manager singletons
        ipcHandlers.resetManagers();

        mockFs({
            '/mock/app-data': {
                'bullet-library': {}
            }
        });
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('registerHandlers()', () => {
        it('should register all IPC handlers', () => {
            ipcHandlers.registerHandlers();

            // Verify ipcMain.handle was called for each channel
            expect(ipcMain.handle).toHaveBeenCalledWith('bullet:add', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('bullet:get', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('bullet:getAll', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('bullet:delete', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('bullet:addVariant', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('bullet:acceptVariant', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('bullet:rejectVariant', expect.any(Function));

            expect(ipcMain.handle).toHaveBeenCalledWith('header:add', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('header:get', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('header:getAll', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('header:delete', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('header:getSubHeaders', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('header:generateMarkdown', expect.any(Function));

            expect(ipcMain.handle).toHaveBeenCalledWith('jobPost:save', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('jobPost:get', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('jobPost:list', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('jobPost:delete', expect.any(Function));
            expect(ipcMain.handle).toHaveBeenCalledWith('jobPost:extractContext', expect.any(Function));
        });
    });

    describe('Bullet Handlers', () => {
        it('should handle bullet:add', async () => {
            ipcHandlers.registerHandlers();

            // Get the registered handler function
            const addHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'bullet:add'
            )[1];

            const result = await addHandler(null, {
                text: 'Test bullet for testing purposes',
                parentHeader: {
                    headerText: 'Experience',
                    headerLevel: 2
                }
            });

            expect(result.success).toBe(true);
            expect(result.data.bullet).toBeDefined();
            expect(result.data.bullet.text).toBe('Test bullet for testing purposes');
        });

        it('should handle bullet:getAll', async () => {
            ipcHandlers.registerHandlers();

            // Add a bullet first
            const addHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'bullet:add'
            )[1];
            await addHandler(null, {
                text: 'Test bullet number one for testing',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            });
            await addHandler(null, {
                text: 'Test bullet number two for testing',
                parentHeader: { headerText: 'Education', headerLevel: 2 }
            });

            // Get all bullets
            const getAllHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'bullet:getAll'
            )[1];
            const result = await getAllHandler();

            expect(result.success).toBe(true);
            expect(result.data.bullets).toHaveLength(2);
        });

        it('should handle bullet:delete', async () => {
            ipcHandlers.registerHandlers();

            // Add a bullet
            const addHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'bullet:add'
            )[1];
            const addResult = await addHandler(null, {
                text: 'Test bullet to be deleted soon',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            });
            const bulletId = addResult.data.bullet.id;

            // Delete it
            const deleteHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'bullet:delete'
            )[1];
            const deleteResult = await deleteHandler(null, bulletId);

            expect(deleteResult.success).toBe(true);
        });

        it('should handle errors gracefully', async () => {
            ipcHandlers.registerHandlers();

            const deleteHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'bullet:delete'
            )[1];

            // Try to delete non-existent bullet
            const result = await deleteHandler(null, 'non-existent-id');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('Header Handlers', () => {
        it('should handle header:add', async () => {
            ipcHandlers.registerHandlers();

            const addHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'header:add'
            )[1];

            const result = await addHandler(null, {
                level: 2,
                text: 'Experience'
            });

            expect(result.success).toBe(true);
            expect(result.data.header.level).toBe(2);
            expect(result.data.header.text).toBe('Experience');
        });

        it('should handle header:getSubHeaders', async () => {
            ipcHandlers.registerHandlers();

            // Add h2 parent
            const addHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'header:add'
            )[1];
            const h2Result = await addHandler(null, { level: 2, text: 'Experience' });
            const h2Id = h2Result.data.header.id;

            // Add h3 child
            await addHandler(null, {
                level: 3,
                text: 'Job Title',
                parentHeaderId: h2Id
            });

            // Get subheaders
            const getSubHeadersHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'header:getSubHeaders'
            )[1];
            const result = await getSubHeadersHandler(null, h2Id);

            expect(result.success).toBe(true);
            expect(result.data.headers.length).toBe(1);
            expect(result.data.headers[0].text).toBe('Job Title');
        });

        it('should handle header:generateMarkdown', async () => {
            ipcHandlers.registerHandlers();

            const addHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'header:add'
            )[1];
            const addResult = await addHandler(null, { level: 2, text: 'Education' });
            const headerId = addResult.data.header.id;

            const generateHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'header:generateMarkdown'
            )[1];
            const result = await generateHandler(null, headerId);

            expect(result.success).toBe(true);
            expect(result.data.markdown).toBe('## Education');
        });
    });

    describe('JobPost Handlers', () => {
        it('should handle jobPost:save', async () => {
            ipcHandlers.registerHandlers();

            const saveHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'jobPost:save'
            )[1];

            const result = await saveHandler(null, '# Software Engineer\n\nJob description...');

            expect(result.success).toBe(true);
            expect(result.data.filename).toBeDefined();
            expect(result.data.title).toBe('Software Engineer');
        });

        it('should handle jobPost:list', async () => {
            ipcHandlers.registerHandlers();

            // Save a job post first
            const saveHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'jobPost:save'
            )[1];
            await saveHandler(null, '# Job 1\n\nContent');

            // List job posts
            const listHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'jobPost:list'
            )[1];
            const result = await listHandler();

            expect(result.success).toBe(true);
            expect(result.data.jobPosts).toHaveLength(1);
        });

        it('should handle jobPost:extractContext', async () => {
            ipcHandlers.registerHandlers();

            // Save a job post
            const saveHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'jobPost:save'
            )[1];
            const saveResult = await saveHandler(null, '# ML Engineer\n\n## Requirements\n- PhD');

            // Extract context
            const extractHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'jobPost:extractContext'
            )[1];
            const result = await extractHandler(null, saveResult.data.filename);

            expect(result.success).toBe(true);
            expect(result.data.context.title).toBe('ML Engineer');
            expect(result.data.context.sections).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should wrap errors in standardized response', async () => {
            ipcHandlers.registerHandlers();

            const addHandler = ipcMain.handle.mock.calls.find(
                call => call[0] === 'bullet:add'
            )[1];

            // Try to add invalid bullet (empty text)
            const result = await addHandler(null, { text: '' });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
        });
    });
});
