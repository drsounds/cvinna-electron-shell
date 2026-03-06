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
  // Main app icon (512x512)
  await sharp(svg).resize(512, 512).png().toFile(path.join(root, 'icon.png'));
  console.log('icon.png done');

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
