/**
 * Jest Setup File
 * Global test configuration and mocks
 */

// Mock Electron app.getPath for testing
global.mockAppDataPath = 'C:\\Users\\testuser\\AppData\\Roaming\\resume-pdf-exporter';

// Mock uuid module
jest.mock('uuid', () => ({
    v4: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
}));

// Suppress console logs during tests unless explicitly testing logging
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};
