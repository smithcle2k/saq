import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import path from 'path';

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.ico', size: 32 },
];

// Timer icon SVG with interval trainer design
const createSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="#1a1a1a"/>
  <!-- Outer ring -->
  <circle cx="256" cy="256" r="200" fill="none" stroke="#333" stroke-width="24"/>
  <!-- Progress arc (blue) -->
  <circle cx="256" cy="256" r="200" fill="none" stroke="url(#grad)" stroke-width="24"
    stroke-dasharray="880 1257" stroke-linecap="round" transform="rotate(-90 256 256)"/>
  <!-- Inner circle -->
  <circle cx="256" cy="256" r="140" fill="#262626"/>
  <!-- Play/Timer indicator -->
  <polygon points="230,180 230,332 340,256" fill="#3b82f6"/>
</svg>
`;

async function generateIcons() {
  const publicDir = path.join(process.cwd(), 'public');

  try {
    await mkdir(publicDir, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  for (const { name, size } of sizes) {
    const svg = Buffer.from(createSvg(size));
    const outputPath = path.join(publicDir, name);

    if (name.endsWith('.ico')) {
      await sharp(svg)
        .resize(size, size)
        .png()
        .toFile(outputPath.replace('.ico', '.png'));
      console.log(`Generated: ${name.replace('.ico', '.png')}`);
    } else {
      await sharp(svg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Generated: ${name}`);
    }
  }

  console.log('\nPWA icons generated successfully in /public');
}

generateIcons().catch(console.error);
