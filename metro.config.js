const fs = require('node:fs');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const coreDirectory = fs.realpathSync(path.join(__dirname, 'node_modules/@kurot/core'));
const uiDirectory = fs.realpathSync(path.join(__dirname, 'node_modules/@kurot/ui'));
const browserTheme = path.join(uiDirectory, 'dist/kurot/core/Theme.js');
const browserCache = path.join(coreDirectory, 'dist/kurot/player/canvas/DisplayList.js');
const nativePorts = new Map([
    [path.join(coreDirectory, 'dist/kurot/net/HttpRequest.js'), 'src/skia/NativeHttpRequest.ts'],
    [path.join(coreDirectory, 'dist/kurot/net/ImageLoader.js'), 'src/skia/NativeImageLoader.ts'],
    [path.join(coreDirectory, 'dist/kurot/text/TextMeasurer.js'), 'src/skia/NativeTextMeasurer.ts'],
    [path.join(coreDirectory, 'dist/kurot/text/TextSegmentation.js'), 'src/skia/NativeTextSegmentation.ts'],
    [path.join(coreDirectory, 'dist/kurot/text/InputController.js'), 'src/skia/NativeInputController.ts'],
]);

// Core's published root includes browser renderers; native loads its real scene modules only.
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'android' || platform === 'ios') {
        if (process.env.KUROT_NATIVE_TESTS === '1' && moduleName === './App'
            && context.originModulePath === path.join(__dirname, 'index.ts')) {
            return { type: 'sourceFile', filePath: path.join(__dirname, 'tests/native/App.tsx') };
        }
        if (moduleName === '@kurot/core') {
            return { type: 'sourceFile', filePath: path.join(__dirname, 'src/skia/core-native.ts') };
        }
        if (path.resolve(path.dirname(context.originModulePath), moduleName) === browserCache) {
            return { type: 'sourceFile', filePath: path.join(__dirname, 'src/skia/NativeDisplayList.ts') };
        }
        if (path.resolve(path.dirname(context.originModulePath), moduleName) === browserTheme) {
            return { type: 'sourceFile', filePath: path.join(__dirname, 'src/skia/NativeTheme.ts') };
        }
        // Only redirect Core's imports. NativeHttpRequest can still inherit the real HTTP transport.
        if (context.originModulePath.startsWith(`${coreDirectory}${path.sep}`)) {
            const port = nativePorts.get(path.resolve(path.dirname(context.originModulePath), moduleName));
            if (port) {
                return { type: 'sourceFile', filePath: path.join(__dirname, port) };
            }
        }
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
