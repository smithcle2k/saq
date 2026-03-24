const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Zustand v5's ESM build (esm/middleware.mjs) uses `import.meta.env` which
// Metro does not support. Force resolution to the CJS builds instead by
// removing the "import" condition that causes Metro to pick up the .mjs files.
config.resolver.unstable_conditionNames = ['require', 'default', 'react-native', 'browser'];

module.exports = config;
