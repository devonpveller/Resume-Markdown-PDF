import React from 'react'
import './PreferencesModal.css'

export function PreferencesModal({ isOpen, onClose, theme, onThemeChange }) {
    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Preferences</h2>
                    <button onClick={onClose} className="close-btn" aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    <div className="preference-section">
                        <h3>Appearance</h3>
                        <div className="preference-group">
                            <label>Theme</label>
                            <div className="theme-options">
                                <button
                                    className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                                    onClick={() => onThemeChange('light')}
                                >
                                    <span className="theme-icon">☀️</span>
                                    <span>Light</span>
                                </button>
                                <button
                                    className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                                    onClick={() => onThemeChange('dark')}
                                >
                                    <span className="theme-icon">🌙</span>
                                    <span>Dark</span>
                                </button>
                                <button
                                    className={`theme-option ${theme === 'system' ? 'active' : ''}`}
                                    onClick={() => onThemeChange('system')}
                                >
                                    <span className="theme-icon">💻</span>
                                    <span>System</span>
                                </button>
                            </div>
                            <p className="preference-hint">
                                Choose how the app appears. System will match your OS theme.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn-primary">
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
