const { generateSW } = require('workbox-build');

generateSW({
  globDirectory: 'dist/',
  globPatterns: ['**/*.{html,json,js,css,woff2,ttf,png,jpg,svg,ico}'],
  swDest: 'dist/sw.js',
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  maximumFileSizeToCacheInBytes: 6000000,
})
  .then(({ count, size, warnings }) => {
    warnings.forEach(console.warn);
    console.log(`${count} files will be precached, totaling ${size} bytes.`);
  })
  .catch(console.error);
