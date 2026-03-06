#!/usr/bin/env node
/**
 * Generates all app icons from DesktopAppIcon.svg using sharp.
 * Run: node scripts/prepare-icons.js
 */
const sharp = require('sharp');
const path = require('path');

const root = path.join(__dirname, '..');
const svg = path.join(root, 'DesktopAppIcon.svg');

async function run() {
  // Main app icon (512x512) with macOS/iOS-style rounded corners (~18% radius)
  const size = 512;
  const radius = Math.round(size * 0.18); // Soft corners matching OS style
  const roundedMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`
  );
  const iconImg = await sharp(svg).resize(size, size).png();
  await iconImg
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toFile(path.join(root, 'icon.png'));
  console.log('icon.png done (rounded corners)');

  // Tray icon for dark menu bars / taskbar (32x32)
  await sharp(svg).resize(32, 32).png().toFile(path.join(root, 'trayIcon.png'));
  console.log('trayIcon.png done');

  // macOS template icon: black strokes on transparent background (16x16)
  const { data, info } = await sharp(svg).resize(16, 16).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r < 30 && g < 30 && b < 30) {
      data[i + 3] = 255; // black stroke: keep
    } else {
      data[i + 3] = 0; // everything else: transparent
    }
  }
  await sharp(data, { raw: info }).png().toFile(path.join(root, 'trayIconTemplate.png'));
  console.log('trayIconTemplate.png done');

  // Light mode tray (same as template)
  const fs = require('fs');
  fs.copyFileSync(path.join(root, 'trayIconTemplate.png'), path.join(root, 'trayIconLight.png'));
  console.log('trayIconLight.png done');
}

run().catch(console.error);
