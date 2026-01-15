/**
 * BulletLibraryPanel Component
 * React UI component for managing bullet library
 * 
 * Features:
 * - Display bullet list with filtering and search
 * - Add, edit, delete bullets
 * - Manage variants (add, accept, reject)
 * - Job post context integration
 * - Error handling and loading states
 * 
 * @module components/BulletLibraryPanel
 */

import React, { useState } from 'react';
import { useBulletLibrary } from '../hooks/useBulletLibrary';
import './BulletLibraryPanel.css';

export function BulletLibraryPanel() {
    const {
        bullets,
        headers,
        jobPosts,
        filteredBullets,
        loading,
        error,
        filterSection,
        searchQuery,
        setFilterSection,
        setSearchQuery,
        addBullet,
        deleteBullet,
        acceptVariant,
        rejectVariant,
        getJobContext,
        clearError,
        refresh
    } = useBulletLibrary();

    const [showAddForm, setShowAddForm] = useState(false);
    const [newBulletText, setNewBulletText] = useState('');
    const [newBulletSection, setNewBulletSection] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [selectedJobPost, setSelectedJobPost] = useState('');
    const [jobContext, setJobContext] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState(null);

    /**
     * Handle importing bullets from current resume
     */
    const handleImportFromResume = async () => {
        try {
            setImporting(true);
            setImportError(null);

            // Read current resume content
            const resumeData = await window.electronAPI.readResume();
            if (!resumeData.success) {
                throw new Error('Failed to read resume');
            }

            // Import bullets and headers
            const result = await window.bulletLibrary.importFromResume(resumeData.content);

            if (result.success) {
                // Refresh the library
                await refresh();

                // Show success message
                const { headers: importedHeaders, bullets: importedBullets } = result.data;
                alert(`Import successful!\nHeaders: ${importedHeaders.length}\nBullets: ${importedBullets.length}`);
            } else {
                throw new Error(result.error || 'Import failed');
            }
        } catch (err) {
            setImportError(err.message);
            console.error('Import error:', err);
        } finally {
            setImporting(false);
        }
    };

    /**
     * Handle adding new bullet
     */
    const handleAddBullet = async () => {
        if (!newBulletText.trim()) return;

        const bulletData = {
            text: newBulletText,
            parentHeader: {
                headerText: newBulletSection,
                headerLevel: 2
            }
        };

        const result = await addBullet(bulletData);
        if (result.success) {
            setNewBulletText('');
            setNewBulletSection('');
            setShowAddForm(false);
        }
    };

    /**
     * Handle deleting bullet
     */
    const handleDeleteBullet = async (bulletId) => {
        await deleteBullet(bulletId);
        setDeleteConfirm(null);
    };

    /**
     * Handle job post selection
     */
    const handleJobPostChange = async (filename) => {
        setSelectedJobPost(filename);
        if (filename) {
            const context = await getJobContext(filename);
            setJobContext(context);
        } else {
            setJobContext(null);
        }
    };

    /**
     * Render loading state
     */
    if (loading) {
        return (
            <div className="bullet-library-panel">
                <div className="loading-container">
                    <div role="progressbar" className="spinner"></div>
                    <p>Loading bullets...</p>
                </div>
            </div>
        );
    }

    /**
     * Render error state
     */
    if (error) {
        return (
            <div className="bullet-library-panel">
                <div className="error-container">
                    <p className="error-message">{error}</p>
                    <button onClick={clearError} aria-label="Dismiss">
                        Dismiss
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bullet-library-panel">
            <header className="panel-header">
                <h2>Bullet Library</h2>
                <div className="header-actions">
                    <button
                        onClick={handleImportFromResume}
                        disabled={importing}
                        className="import-btn"
                        aria-label="Import from Resume"
                    >
                        {importing ? 'Importing...' : 'Import from Current Resume'}
                    </button>
                    <button onClick={refresh} aria-label="Refresh">
                        Refresh
                    </button>
                </div>
            </header>

            {/* Import Error Display */}
            {importError && (
                <div className="error-container">
                    <p className="error-message">{importError}</p>
                    <button onClick={() => setImportError(null)} aria-label="Dismiss">
                        Dismiss
                    </button>
                </div>
            )}

            {/* Filter and Search Controls */}
            <div className="controls">
                <div className="filter-group">
                    <label htmlFor="filter-section">Filter by Section:</label>
                    <select
                        id="filter-section"
                        value={filterSection}
                        onChange={(e) => setFilterSection(e.target.value)}
                    >
                        <option value="all">All Sections</option>
                        {headers.map(header => (
                            <option key={header.id} value={header.text}>
                                {header.level === 3 ? `  ↳ ${header.text}` : header.text}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="search-group">
                    <label htmlFor="search-input">Search:</label>
                    <input
                        id="search-input"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search bullets..."
                    />
                </div>
            </div>

            {/* Job Post Context Selector */}
            {jobPosts.length > 0 && (
                <div className="job-post-selector">
                    <label htmlFor="job-post-select">Job Post Context:</label>
                    <select
                        id="job-post-select"
                        value={selectedJobPost}
                        onChange={(e) => handleJobPostChange(e.target.value)}
                    >
                        <option value="">No Job Context</option>
                        {jobPosts.map(jobPost => (
                            <option key={jobPost.filename} value={jobPost.filename}>
                                {jobPost.title || jobPost.filename}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Add Bullet Button */}
            {!showAddForm && (
                <button
                    className="add-bullet-btn"
                    onClick={() => setShowAddForm(true)}
                    aria-label="Add Bullet"
                >
                    Add Bullet
                </button>
            )}

            {/* Add Bullet Form */}
            {showAddForm && (
                <div className="add-bullet-form">
                    <div className="form-group">
                        <label htmlFor="bullet-text">Bullet Text:</label>
                        <textarea
                            id="bullet-text"
                            value={newBulletText}
                            onChange={(e) => setNewBulletText(e.target.value)}
                            placeholder="Enter bullet text..."
                            rows={3}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="bullet-section">Bullet Section:</label>
                        <select
                            id="bullet-section"
                            value={newBulletSection}
                            onChange={(e) => setNewBulletSection(e.target.value)}
                        >
                            <option value="">Select Section</option>
                            {headers.map(header => (
                                <option key={header.id} value={header.text}>
                                    {header.level === 3 ? `  ↳ ${header.text}` : header.text}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-actions">
                        <button onClick={handleAddBullet} aria-label="Save">
                            Save
                        </button>
                        <button onClick={() => setShowAddForm(false)} aria-label="Cancel">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Bullet List */}
            {filteredBullets.length === 0 ? (
                <p className="empty-state">No bullets found</p>
            ) : (
                <ul className="bullet-list">
                    {filteredBullets.map(bullet => (
                        <li key={bullet.id} className="bullet-item">
                            <div className="bullet-content">
                                <p className="bullet-text">{bullet.text}</p>
                                <span className="bullet-section">
                                    {bullet.parentHeader?.sectionHeader || bullet.parentHeader?.headerText}
                                </span>
                            </div>

                            <div className="bullet-actions">
                                {deleteConfirm === bullet.id ? (
                                    <>
                                        <button
                                            onClick={() => handleDeleteBullet(bullet.id)}
                                            aria-label="Confirm"
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(null)}
                                            aria-label="Cancel Delete"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setDeleteConfirm(bullet.id)}
                                        aria-label="Delete"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>

                            {/* Variants */}
                            {bullet.pendingVariants && bullet.pendingVariants.length > 0 && (
                                <ul className="variant-list">
                                    {bullet.pendingVariants.map(variant => (
                                        <li key={variant.id} className="variant-item">
                                            <p className="variant-text">{variant.text}</p>
                                            <div className="variant-actions">
                                                <button
                                                    onClick={() => acceptVariant(bullet.id, variant.id)}
                                                    aria-label="Accept"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => rejectVariant(bullet.id, variant.id)}
                                                    aria-label="Reject"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
