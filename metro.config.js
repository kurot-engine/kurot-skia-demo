const fs = require('node:fs');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const coreDirectory = fs.realpathSync(path.join(__dirname, 'node_modules/@kurot/core'));
const browserCache = path.join(coreDirectory, 'dist/kurot/player/canvas/DisplayList.js');

// Core's published root includes browser renderers; native loads its real scene modules only.
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'android' || platform === 'ios') {
        if (moduleName === '@kurot/core') {
            return { type: 'sourceFile', filePath: path.join(__dirname, 'src/skia/core-native.ts') };
        }
        if (path.resolve(path.dirname(context.originModulePath), moduleName) === browserCache) {
            return { type: 'sourceFile', filePath: path.join(__dirname, 'src/skia/NativeDisplayList.ts') };
        }
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
