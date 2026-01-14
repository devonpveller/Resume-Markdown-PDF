/**
 * Babel Configuration
 * Transforms ES6+ syntax and React JSX for Jest tests
 */
module.exports = {
    presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
    ]
};
