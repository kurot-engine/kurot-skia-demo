const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { createKurotResolver } = require('@kurot/skia/metro');

const config = getDefaultConfig(__dirname);
const resolveKurot = createKurotResolver(__dirname, config.resolver.resolveRequest ?? undefined);

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if ((platform === 'android' || platform === 'ios')
        && process.env.KUROT_NATIVE_TESTS === '1' && moduleName === './App'
        && context.originModulePath === path.join(__dirname, 'index.ts')) {
        return { type: 'sourceFile', filePath: path.join(__dirname, 'tests/native/App.tsx') };
    }
    return resolveKurot(context, moduleName, platform);
};

module.exports = config;
