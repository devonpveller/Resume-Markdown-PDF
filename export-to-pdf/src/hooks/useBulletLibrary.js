/**
 * useBulletLibrary Hook
 * React hook for managing bullet library state and operations
 * 
 * Features:
 * - Load and manage bullets, headers, job posts
 * - CRUD operations with optimistic updates
 * - Variant workflow (add, accept, reject)
 * - Filtering by section and search query
 * - Job context extraction for AI rephrasing
 * 
 * @module hooks/useBulletLibrary
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for bullet library state management
 * @returns {Object} State and operations for bullet library
 */
export function useBulletLibrary() {
    // State management
    const [bullets, setBullets] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [jobPosts, setJobPosts] = useState([]);
    const [filteredBullets, setFilteredBullets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter state
    const [filterSection, setFilterSection] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    /**
     * Load initial data from Electron backend
     */
    useEffect(() => {
        async function loadData() {
            try {
                setIsLoading(true);
                setError(null);

                const [bulletsData, headersData, jobPostsData] = await Promise.all([
                    window.bulletLibrary.getAllBullets(),
                    window.bulletLibrary.getAllHeaders(),
                    window.bulletLibrary.listJobPosts ? window.bulletLibrary.listJobPosts() :
                        window.bulletLibrary.getAllJobPosts ? window.bulletLibrary.getAllJobPosts() :
                            Promise.resolve({ success: true, data: { jobPosts: [] } })
                ]);

                // Check for errors in responses
                if (!bulletsData.success) {
                    setError(bulletsData.error || 'Failed to load bullets');
                    return;
                }
                if (!headersData.success) {
                    setError(headersData.error || 'Failed to load headers');
                    return;
                }
                if (!jobPostsData.success) {
                    setError(jobPostsData.error || 'Failed to load job posts');
                    return;
                }

                // Extract data from responses
                const bullets = bulletsData.data.bullets || bulletsData.data || [];
                const headers = headersData.data.headers || headersData.data || [];
                const jobPosts = jobPostsData.data.jobPosts || jobPostsData.data || [];

                setBullets(bullets);
                setFilteredBullets(bullets);
                setHeaders(headers);
                setJobPosts(jobPosts);
            } catch (err) {
                setError(err.message || 'Failed to load bullet library data');
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, []);

    /**
     * Apply filters whenever bullets, filterSection, or searchQuery changes
     */
    useEffect(() => {
        let filtered = bullets;

        // Filter by section
        if (filterSection && filterSection !== 'all') {
            filtered = filtered.filter(bullet => {
                // Check both sectionHeader and headerText fields
                const section = bullet.parentHeader?.sectionHeader || bullet.parentHeader?.headerText;
                return section === filterSection;
            });
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(bullet =>
                bullet.text.toLowerCase().includes(query)
            );
        }

        setFilteredBullets(filtered);
    }, [bullets, filterSection, searchQuery]);

    /**
     * Add new bullet to library
     * @param {Object} bulletData - Bullet data with text and parentHeader
     * @returns {Promise<Object>} Result with created bullet
     */
    const addBullet = useCallback(async (bulletData) => {
        try {
            const result = await window.bulletLibrary.addBullet(bulletData);
            if (result.success) {
                // Refresh bullets to get complete list
                const bulletsData = await window.bulletLibrary.getAllBullets();
                if (bulletsData.success) {
                    const bullets = bulletsData.data.bullets || bulletsData.data || [];
                    setBullets(bullets);
                }
                setError(null);
                return result;
            }
            setError(result.error || 'Failed to add bullet');
            return result;
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, []);

    /**
     * Update existing bullet
     * @param {string} bulletId - Bullet ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Result with updated bullet
     */
    const updateBullet = useCallback(async (bulletId, updates) => {
        try {
            const result = await window.bulletLibrary.updateBullet(bulletId, updates);
            if (result.success) {
                // Refresh bullets
                const bulletsData = await window.bulletLibrary.getAllBullets();
                if (bulletsData.success) {
                    const bullets = bulletsData.data.bullets || bulletsData.data || [];
                    setBullets(bullets);
                }
                return result;
            }
            throw new Error(result.error || 'Failed to update bullet');
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Delete bullet from library
     * @param {string} bulletId - Bullet ID to delete
     * @returns {Promise<Object>} Result with success status
     */
    const deleteBullet = useCallback(async (bulletId) => {
        try {
            const result = await window.bulletLibrary.deleteBullet(bulletId);
            if (result.success) {
                // Refresh bullets
                const bulletsData = await window.bulletLibrary.getAllBullets();
                if (bulletsData.success) {
                    const bullets = bulletsData.data.bullets || bulletsData.data || [];
                    setBullets(bullets);
                }
                return result;
            }
            throw new Error(result.error || 'Failed to delete bullet');
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Add variant to bullet
     * @param {string} bulletId - Parent bullet ID
     * @param {string} variantText - Variant text
     * @returns {Promise<Object>} Result with added variant
     */
    const addVariant = useCallback(async (bulletId, variantText) => {
        try {
            const result = await window.bulletLibrary.addBulletVariant(bulletId, variantText);
            if (result.success) {
                // Refresh bullets to get updated data
                const bulletsData = await window.bulletLibrary.getAllBullets();
                if (bulletsData.success) {
                    const bullets = bulletsData.data.bullets || bulletsData.data || [];
                    setBullets(bullets);
                }
                return result;
            }
            throw new Error(result.error || 'Failed to add variant');
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Accept variant and promote to primary
     * @param {string} bulletId - Parent bullet ID
     * @param {string} variantId - Variant ID to accept
     * @returns {Promise<Object>} Result with updated bullet
     */
    const acceptVariant = useCallback(async (bulletId, variantId) => {
        try {
            const result = await window.bulletLibrary.acceptVariant(bulletId, variantId);
            if (result.success) {
                // Refresh bullets
                const bulletsData = await window.bulletLibrary.getAllBullets();
                if (bulletsData.success) {
                    const bullets = bulletsData.data.bullets || bulletsData.data || [];
                    setBullets(bullets);
                }
                return result;
            }
            throw new Error(result.error || 'Failed to accept variant');
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Reject variant and remove from bullet
     * @param {string} bulletId - Parent bullet ID
     * @param {string} variantId - Variant ID to reject
     * @returns {Promise<Object>} Result with updated bullet
     */
    const rejectVariant = useCallback(async (bulletId, variantId) => {
        try {
            const result = await window.bulletLibrary.rejectVariant(bulletId, variantId);
            if (result.success) {
                // Refresh bullets
                const bulletsData = await window.bulletLibrary.getAllBullets();
                if (bulletsData.success) {
                    const bullets = bulletsData.data.bullets || bulletsData.data || [];
                    setBullets(bullets);
                }
                return result;
            }
            throw new Error(result.error || 'Failed to reject variant');
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Get job post context for AI rephrasing
     * @param {string} jobPostId - Job post ID
     * @returns {Promise<Object>} Extracted context object
     */
    const getJobContext = useCallback(async (jobPostId) => {
        try {
            const result = await window.bulletLibrary.extractJobContext(jobPostId);
            if (result.success) {
                return result.data.context || result.data;
            }
            throw new Error(result.error || 'Failed to extract job context');
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Add new header to library
     * @param {Object} headerData - Header data with text, level, parent
     * @returns {Promise<Object>} Result with created header
     */
    const addHeader = useCallback(async (headerData) => {
        try {
            const result = await window.bulletLibrary.addHeader(headerData);
            if (result.success) {
                // Refresh headers
                const headersData = await window.bulletLibrary.getAllHeaders();
                if (headersData.success) {
                    const headers = headersData.data.headers || headersData.data || [];
                    setHeaders(headers);
                }
                return result;
            }
            throw new Error(result.error || 'Failed to add header');
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Delete header from library
     * @param {string} headerId - Header ID to delete
     * @returns {Promise<Object>} Result with success status
     */
    const deleteHeader = useCallback(async (headerId) => {
        try {
            const result = await window.bulletLibrary.deleteHeader(headerId);
            if (result.success) {
                // Refresh headers
                const headersData = await window.bulletLibrary.getAllHeaders();
                if (headersData.success) {
                    const headers = headersData.data.headers || headersData.data || [];
                    setHeaders(headers);
                }
                return result;
            }
            throw new Error(result.error || 'Failed to delete header');
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Import job posting from file or markdown
     * @param {string} markdown - Job post markdown content
     * @returns {Promise<Object>} Result with created job post
     */
    const importJobPost = useCallback(async (markdown) => {
        try {
            const result = await window.bulletLibrary.saveJobPost(markdown);
            if (result.success) {
                // Refresh job posts
                const jobPostsData = await window.bulletLibrary.listJobPosts();
                if (jobPostsData.success) {
                    const jobPosts = jobPostsData.data.jobPosts || jobPostsData.data || [];
                    setJobPosts(jobPosts);
                }
                return result;
            }
            throw new Error(result.error || 'Failed to import job post');
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Delete job post from library
     * @param {string} jobPostId - Job post ID to delete
     * @returns {Promise<Object>} Result with success status
     */
    const deleteJobPost = useCallback(async (jobPostId) => {
        try {
            const result = await window.bulletLibrary.deleteJobPost(jobPostId);
            if (result.success) {
                // Refresh job posts
                const jobPostsData = await window.bulletLibrary.listJobPosts();
                if (jobPostsData.success) {
                    const jobPosts = jobPostsData.data.jobPosts || jobPostsData.data || [];
                    setJobPosts(jobPosts);
                }
                return result;
            }
            throw new Error(result.error || 'Failed to delete job post');
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    /**
     * Clear any errors
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Refresh all data from backend
     */
    const refresh = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const [bulletsData, headersData, jobPostsData] = await Promise.all([
                window.bulletLibrary.getAllBullets(),
                window.bulletLibrary.getAllHeaders(),
                window.bulletLibrary.listJobPosts()
            ]);

            if (!bulletsData.success) {
                setError(bulletsData.error || 'Failed to load bullets');
                return;
            }
            if (!headersData.success) {
                setError(headersData.error || 'Failed to load headers');
                return;
            }
            if (!jobPostsData.success) {
                setError(jobPostsData.error || 'Failed to load job posts');
                return;
            }

            const bullets = bulletsData.data.bullets || bulletsData.data || [];
            const headers = headersData.data.headers || headersData.data || [];
            const jobPosts = jobPostsData.data.jobPosts || jobPostsData.data || [];

            setBullets(bullets);
            setFilteredBullets(bullets);
            setHeaders(headers);
            setJobPosts(jobPosts);
        } catch (err) {
            setError(err.message || 'Failed to refresh data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        // State
        bullets,
        headers,
        jobPosts,
        filteredBullets,
        loading: isLoading,
        error,

        // Filter state
        filterSection,
        searchQuery,
        setFilterSection,
        setSearchQuery,

        // Operations
        addBullet,
        updateBullet,
        deleteBullet,
        addVariant,
        acceptVariant,
        rejectVariant,
        getJobContext,
        addHeader,
        deleteHeader,
        importJobPost,
        deleteJobPost,
        clearError,
        refresh
    };
}
