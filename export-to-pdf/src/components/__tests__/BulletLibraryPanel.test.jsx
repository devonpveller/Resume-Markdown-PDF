/**
 * BulletLibraryPanel Component Tests
 * Tests for React UI component managing bullet library
 * 
 * Test Coverage:
 * - Rendering and display
 * - Bullet CRUD operations
 * - Variant management UI
 * - Filter and search functionality
 * - Job post integration
 * - Error handling and loading states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BulletLibraryPanel } from '../BulletLibraryPanel';
import { useBulletLibrary } from '../../hooks/useBulletLibrary';

// Mock the useBulletLibrary hook
jest.mock('../../hooks/useBulletLibrary');

describe('BulletLibraryPanel', () => {
    const mockBulletLibraryHook = {
        bullets: [],
        headers: [],
        jobPosts: [],
        filteredBullets: [],
        loading: false,
        error: null,
        filterSection: 'all',
        searchQuery: '',
        setFilterSection: jest.fn(),
        setSearchQuery: jest.fn(),
        addBullet: jest.fn(),
        updateBullet: jest.fn(),
        deleteBullet: jest.fn(),
        addVariant: jest.fn(),
        acceptVariant: jest.fn(),
        rejectVariant: jest.fn(),
        getJobContext: jest.fn(),
        addHeader: jest.fn(),
        deleteHeader: jest.fn(),
        importJobPost: jest.fn(),
        deleteJobPost: jest.fn(),
        clearError: jest.fn(),
        refresh: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        useBulletLibrary.mockReturnValue(mockBulletLibraryHook);
    });

    describe('Rendering', () => {
        it('should render empty state when no bullets', () => {
            render(<BulletLibraryPanel />);

            expect(screen.getByText(/bullet library/i)).toBeInTheDocument();
            expect(screen.getByText(/no bullets found/i)).toBeInTheDocument();
        });

        it('should display loading state', () => {
            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                loading: true
            });

            render(<BulletLibraryPanel />);

            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        it('should display error message', () => {
            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                error: 'Failed to load bullets'
            });

            render(<BulletLibraryPanel />);

            expect(screen.getByText(/failed to load bullets/i)).toBeInTheDocument();
        });

        it('should render bullet list when bullets exist', () => {
            const mockBullets = [
                { id: '1', text: 'Bullet 1', parentHeader: { headerText: 'Experience' } },
                { id: '2', text: 'Bullet 2', parentHeader: { headerText: 'Experience' } }
            ];

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                bullets: mockBullets,
                filteredBullets: mockBullets
            });

            render(<BulletLibraryPanel />);

            expect(screen.getByText('Bullet 1')).toBeInTheDocument();
            expect(screen.getByText('Bullet 2')).toBeInTheDocument();
        });
    });

    describe('Filter and Search', () => {
        it('should render filter controls', () => {
            const mockHeaders = [
                { id: 'h1', level: 2, text: 'Experience' },
                { id: 'h2', level: 2, text: 'Education' }
            ];

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                headers: mockHeaders
            });

            render(<BulletLibraryPanel />);

            expect(screen.getByLabelText(/filter by section/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
        });

        it('should call setFilterSection when filter changed', () => {
            const setFilterSection = jest.fn();
            const mockHeaders = [
                { id: 'h1', level: 2, text: 'Experience' }
            ];

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                headers: mockHeaders,
                setFilterSection
            });

            render(<BulletLibraryPanel />);

            const filterSelect = screen.getByLabelText(/filter by section/i);
            fireEvent.change(filterSelect, { target: { value: 'Experience' } });

            expect(setFilterSection).toHaveBeenCalledWith('Experience');
        });

        it('should call setSearchQuery when search input changed', () => {
            const setSearchQuery = jest.fn();

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                setSearchQuery
            });

            render(<BulletLibraryPanel />);

            const searchInput = screen.getByLabelText(/search/i);
            fireEvent.change(searchInput, { target: { value: 'test query' } });

            expect(setSearchQuery).toHaveBeenCalledWith('test query');
        });
    });

    describe('Bullet Operations', () => {
        it('should show add bullet form', () => {
            render(<BulletLibraryPanel />);

            const addButton = screen.getByRole('button', { name: /add bullet/i });
            fireEvent.click(addButton);

            expect(screen.getByLabelText(/bullet text/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/bullet section/i)).toBeInTheDocument();
        });

        it('should call addBullet when form submitted', async () => {
            const addBullet = jest.fn().mockResolvedValue({ success: true });
            const mockHeaders = [
                { id: 'h1', level: 2, text: 'Experience' }
            ];

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                headers: mockHeaders,
                addBullet
            });

            render(<BulletLibraryPanel />);

            const addButton = screen.getByRole('button', { name: /add bullet/i });
            fireEvent.click(addButton);

            const textInput = screen.getByLabelText(/bullet text/i);
            fireEvent.change(textInput, { target: { value: 'New bullet text with sufficient length' } });

            const submitButton = screen.getByRole('button', { name: /save/i });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(addBullet).toHaveBeenCalledWith(expect.objectContaining({
                    text: 'New bullet text with sufficient length'
                }));
            });
        });

        it('should call deleteBullet when delete button clicked', async () => {
            const deleteBullet = jest.fn().mockResolvedValue({ success: true });
            const mockBullets = [
                { id: '1', text: 'Bullet 1', parentHeader: { headerText: 'Experience' } }
            ];

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                bullets: mockBullets,
                filteredBullets: mockBullets,
                deleteBullet
            });

            render(<BulletLibraryPanel />);

            const deleteButton = screen.getByRole('button', { name: /delete/i });
            fireEvent.click(deleteButton);

            // Confirm deletion
            const confirmButton = screen.getByRole('button', { name: /confirm/i });
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(deleteBullet).toHaveBeenCalledWith('1');
            });
        });
    });

    describe('Variant Management', () => {
        const bulletWithVariants = {
            id: '1',
            text: 'Original bullet text',
            parentHeader: { headerText: 'Experience' },
            pendingVariants: [
                { id: 'v1', text: 'Variant 1', status: 'pending' },
                { id: 'v2', text: 'Variant 2', status: 'pending' }
            ]
        };

        it('should display pending variants', () => {
            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                bullets: [bulletWithVariants],
                filteredBullets: [bulletWithVariants]
            });

            render(<BulletLibraryPanel />);

            expect(screen.getByText('Variant 1')).toBeInTheDocument();
            expect(screen.getByText('Variant 2')).toBeInTheDocument();
        });

        it('should call acceptVariant when accept button clicked', async () => {
            const acceptVariant = jest.fn().mockResolvedValue({ success: true });

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                bullets: [bulletWithVariants],
                filteredBullets: [bulletWithVariants],
                acceptVariant
            });

            render(<BulletLibraryPanel />);

            const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
            fireEvent.click(acceptButtons[0]);

            await waitFor(() => {
                expect(acceptVariant).toHaveBeenCalledWith('1', 'v1');
            });
        });

        it('should call rejectVariant when reject button clicked', async () => {
            const rejectVariant = jest.fn().mockResolvedValue({ success: true });

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                bullets: [bulletWithVariants],
                filteredBullets: [bulletWithVariants],
                rejectVariant
            });

            render(<BulletLibraryPanel />);

            const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
            fireEvent.click(rejectButtons[0]);

            await waitFor(() => {
                expect(rejectVariant).toHaveBeenCalledWith('1', 'v1');
            });
        });
    });

    describe('Job Post Integration', () => {
        it('should display job post selector', () => {
            const mockJobPosts = [
                { filename: 'job1.md', title: 'Software Engineer' },
                { filename: 'job2.md', title: 'Frontend Developer' }
            ];

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                jobPosts: mockJobPosts
            });

            render(<BulletLibraryPanel />);

            expect(screen.getByLabelText(/job post context/i)).toBeInTheDocument();
        });

        it('should extract job context when job post selected', async () => {
            const getJobContext = jest.fn().mockResolvedValue({
                title: 'Software Engineer',
                fullText: 'Job description...'
            });
            const mockJobPosts = [
                { filename: 'job1.md', title: 'Software Engineer' }
            ];

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                jobPosts: mockJobPosts,
                getJobContext
            });

            render(<BulletLibraryPanel />);

            const jobPostSelect = screen.getByLabelText(/job post context/i);
            fireEvent.change(jobPostSelect, { target: { value: 'job1.md' } });

            await waitFor(() => {
                expect(getJobContext).toHaveBeenCalledWith('job1.md');
            });
        });
    });

    describe('User Interactions', () => {
        it('should clear error when error dismiss clicked', () => {
            const clearError = jest.fn();

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                error: 'Test error',
                clearError
            });

            render(<BulletLibraryPanel />);

            const dismissButton = screen.getByRole('button', { name: /dismiss/i });
            fireEvent.click(dismissButton);

            expect(clearError).toHaveBeenCalled();
        });

        it('should refresh data when refresh button clicked', () => {
            const refresh = jest.fn();

            useBulletLibrary.mockReturnValue({
                ...mockBulletLibraryHook,
                refresh
            });

            render(<BulletLibraryPanel />);

            const refreshButton = screen.getByRole('button', { name: /refresh/i });
            fireEvent.click(refreshButton);

            expect(refresh).toHaveBeenCalled();
        });
    });
});
