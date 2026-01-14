/**
 * useBulletLibrary Hook Tests
 * Tests for React hook managing bullet library state
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBulletLibrary } from '../useBulletLibrary';

// Mock window.bulletLibrary API
const mockBulletLibrary = {
    getAllBullets: jest.fn(),
    addBullet: jest.fn(),
    deleteBullet: jest.fn(),
    addBulletVariant: jest.fn(),
    acceptVariant: jest.fn(),
    rejectVariant: jest.fn(),
    getAllHeaders: jest.fn(),
    addHeader: jest.fn(),
    getSubHeaders: jest.fn(),
    listJobPosts: jest.fn(),
    saveJobPost: jest.fn(),
    extractJobContext: jest.fn()
};

global.window = global.window || {};
window.bulletLibrary = mockBulletLibrary;

describe('useBulletLibrary', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock responses
        mockBulletLibrary.getAllBullets.mockResolvedValue({
            success: true,
            data: { bullets: [] }
        });

        mockBulletLibrary.getAllHeaders.mockResolvedValue({
            success: true,
            data: { headers: [] }
        });

        mockBulletLibrary.listJobPosts.mockResolvedValue({
            success: true,
            data: { jobPosts: [] }
        });
    });

    describe('Initial Load', () => {
        it('should load bullets on mount', async () => {
            const mockBullets = [
                { id: '1', text: 'Bullet 1', parentHeader: { headerText: 'Experience' } },
                { id: '2', text: 'Bullet 2', parentHeader: { headerText: 'Experience' } }
            ];

            mockBulletLibrary.getAllBullets.mockResolvedValue({
                success: true,
                data: { bullets: mockBullets }
            });

            const { result } = renderHook(() => useBulletLibrary());

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.bullets).toEqual(mockBullets);
            expect(mockBulletLibrary.getAllBullets).toHaveBeenCalledTimes(1);
        });

        it('should load headers on mount', async () => {
            const mockHeaders = [
                { id: 'h1', level: 2, text: 'Experience' },
                { id: 'h2', level: 2, text: 'Education' }
            ];

            mockBulletLibrary.getAllHeaders.mockResolvedValue({
                success: true,
                data: { headers: mockHeaders }
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.headers).toEqual(mockHeaders);
        });

        it('should handle load errors gracefully', async () => {
            mockBulletLibrary.getAllBullets.mockResolvedValue({
                success: false,
                error: 'Failed to load bullets'
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.error).toBe('Failed to load bullets');
            expect(result.current.bullets).toEqual([]);
        });
    });

    describe('addBullet', () => {
        it('should add bullet and refresh list', async () => {
            const newBullet = {
                text: 'New bullet with sufficient length',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            };

            mockBulletLibrary.addBullet.mockResolvedValue({
                success: true,
                data: { bullet: { id: 'new-1', ...newBullet } }
            });

            mockBulletLibrary.getAllBullets.mockResolvedValue({
                success: true,
                data: { bullets: [{ id: 'new-1', ...newBullet }] }
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addBullet(newBullet);
            });

            expect(mockBulletLibrary.addBullet).toHaveBeenCalledWith(newBullet);
            expect(mockBulletLibrary.getAllBullets).toHaveBeenCalledTimes(2); // Initial + refresh
        });

        it('should handle add errors', async () => {
            mockBulletLibrary.addBullet.mockResolvedValue({
                success: false,
                error: 'Validation failed'
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addBullet({ text: 'Test' });
            });

            expect(result.current.error).toBe('Validation failed');
        });
    });

    describe('deleteBullet', () => {
        it('should delete bullet and refresh list', async () => {
            mockBulletLibrary.deleteBullet.mockResolvedValue({
                success: true,
                data: { deleted: true }
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.deleteBullet('bullet-1');
            });

            expect(mockBulletLibrary.deleteBullet).toHaveBeenCalledWith('bullet-1');
            expect(mockBulletLibrary.getAllBullets).toHaveBeenCalledTimes(2);
        });
    });

    describe('Variant Management', () => {
        it('should add pending variant', async () => {
            mockBulletLibrary.addBulletVariant.mockResolvedValue({
                success: true,
                data: { variant: { id: 'v1', text: 'Variant text' } }
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.addVariant('bullet-1', 'Variant text');
            });

            expect(mockBulletLibrary.addBulletVariant).toHaveBeenCalledWith('bullet-1', 'Variant text');
        });

        it('should accept variant', async () => {
            mockBulletLibrary.acceptVariant.mockResolvedValue({
                success: true,
                data: { accepted: true }
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.acceptVariant('bullet-1', 'variant-1');
            });

            expect(mockBulletLibrary.acceptVariant).toHaveBeenCalledWith('bullet-1', 'variant-1');
            expect(mockBulletLibrary.getAllBullets).toHaveBeenCalledTimes(2); // Refresh after accept
        });

        it('should reject variant', async () => {
            mockBulletLibrary.rejectVariant.mockResolvedValue({
                success: true,
                data: { rejected: true }
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            await act(async () => {
                await result.current.rejectVariant('bullet-1', 'variant-1');
            });

            expect(mockBulletLibrary.rejectVariant).toHaveBeenCalledWith('bullet-1', 'variant-1');
            expect(mockBulletLibrary.getAllBullets).toHaveBeenCalledTimes(2);
        });
    });

    describe('Filter and Search', () => {
        it('should filter bullets by section', async () => {
            const mockBullets = [
                { id: '1', text: 'Bullet 1', parentHeader: { headerText: 'Experience', sectionHeader: 'Experience' } },
                { id: '2', text: 'Bullet 2', parentHeader: { headerText: 'Education', sectionHeader: 'Education' } }
            ];

            mockBulletLibrary.getAllBullets.mockResolvedValue({
                success: true,
                data: { bullets: mockBullets }
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            act(() => {
                result.current.setFilterSection('Experience');
            });

            expect(result.current.filteredBullets).toHaveLength(1);
            expect(result.current.filteredBullets[0].id).toBe('1');
        });

        it('should search bullets by text', async () => {
            const mockBullets = [
                { id: '1', text: 'Implemented React components' },
                { id: '2', text: 'Built Node.js backend' }
            ];

            mockBulletLibrary.getAllBullets.mockResolvedValue({
                success: true,
                data: { bullets: mockBullets }
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            act(() => {
                result.current.setSearchQuery('React');
            });

            expect(result.current.filteredBullets).toHaveLength(1);
            expect(result.current.filteredBullets[0].id).toBe('1');
        });
    });

    describe('Job Post Integration', () => {
        it('should load job posts', async () => {
            const mockJobPosts = [
                { filename: 'job1.md', title: 'Software Engineer' },
                { filename: 'job2.md', title: 'Frontend Developer' }
            ];

            mockBulletLibrary.listJobPosts.mockResolvedValue({
                success: true,
                data: { jobPosts: mockJobPosts }
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.jobPosts).toEqual(mockJobPosts);
        });

        it('should extract job context for AI rephrasing', async () => {
            mockBulletLibrary.extractJobContext.mockResolvedValue({
                success: true,
                data: {
                    context: {
                        title: 'ML Engineer',
                        fullText: 'Job description...',
                        sections: [{ heading: 'Requirements', content: 'PhD required' }]
                    }
                }
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            let context;
            await act(async () => {
                context = await result.current.getJobContext('job1.md');
            });

            expect(context.title).toBe('ML Engineer');
            expect(mockBulletLibrary.extractJobContext).toHaveBeenCalledWith('job1.md');
        });
    });

    describe('State Management', () => {
        it('should expose loading state', async () => {
            const { result } = renderHook(() => useBulletLibrary());

            expect(result.current.loading).toBe(true);

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        it('should expose error state', async () => {
            mockBulletLibrary.getAllBullets.mockResolvedValue({
                success: false,
                error: 'Network error'
            });

            const { result } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.error).toBe('Network error');
            });
        });

        it('should clear error on successful operation', async () => {
            // First fail
            mockBulletLibrary.getAllBullets.mockResolvedValueOnce({
                success: false,
                error: 'Error'
            });

            const { result, rerender } = renderHook(() => useBulletLibrary());

            await waitFor(() => {
                expect(result.current.error).toBe('Error');
            });

            // Then succeed
            mockBulletLibrary.getAllBullets.mockResolvedValue({
                success: true,
                data: { bullets: [] }
            });

            await act(async () => {
                await result.current.refresh();
            });

            expect(result.current.error).toBeNull();
        });
    });
});
