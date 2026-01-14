/**
 * Jest Configuration
 * Test framework configuration for Node.js backend and React frontend
 */
module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/electron', '<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.{js,cjs,jsx}'],
    moduleFileExtensions: ['js', 'cjs', 'jsx', 'json'],
    collectCoverageFrom: [
        'electron/managers/**/*.cjs',
        'electron/services/**/*.cjs',
        'src/services/**/*.js',
        'src/hooks/**/*.js',
        '!**/__tests__/**'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
    verbose: true,
    // Transform ES6 modules and JSX using Babel
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@testing-library)/)'
    ],
    // Mock CSS imports
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
    },
    testTimeout: 10000
};
