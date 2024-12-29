const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
    entry: './src/index.js', // Entry point for your application
    output: {
        path: path.resolve(__dirname, 'dist'), // Output directory
        filename: 'bundle.js', // Output file name
    },
    mode: 'production', // Use 'development' for development builds
    target: 'electron-main', // Target Electron main process
    externals: [
        nodeExternals({
            allowlist: ['src/'] // Optionally include specific modules
        })
    ],
    module: {
        rules: [
            {
                test: /\.js$/, // Apply this rule to all JavaScript files
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader', // Use Babel for transpiling
                    options: {
                        presets: ['@babel/preset-env'], // Use the preset for ES6+ features
                        plugins: ['transform-remove-console'] // Add the plugin here if needed
                    },
                },
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/index.html', to: 'index.html' }, // Copy HTML file
                { from: 'src/styles.css', to: 'styles.css' }, // Copy CSS file
                { from: 'src/preload.js', to: 'preload.js' }, // Copy preload script
                { from: 'src/renderer.js', to: 'renderer.js' }, // Copy renderer script
                { from: 'src/pokemon_names.csv', to: 'pokemon_names.csv' }, // Copy pokemon names list
                { from: 'src/icons/delete.png', to: 'icons/delete.png' }, // Copy icons directory
                { from: 'src/icons/upload.png', to: 'icons/upload.png' }, // Copy icons directory
                { from: 'src/icons/download.png', to: 'icons/download.png' }, // Copy icons directory
            ],
        }),
        // Uncomment if you want to use obfuscation
        new WebpackObfuscator({
            rotateUnicodeArray: true, // Obfuscate JavaScript code
        }, []),
    ],
};
