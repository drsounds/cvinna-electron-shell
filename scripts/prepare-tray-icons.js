#!/usr/bin/env node
/**
 * Generates trayIconTemplate.png (macOS) and trayIconLight.png (Windows light mode)
 * from trayIcon.png. Run: node scripts/prepare-tray-icons.js
 */
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'trayIcon.png');
const templatePath = path.join(__dirname, '..', 'trayIconTemplate.png');
const lightPath = path.join(__dirname, '..', 'trayIconLight.png');

if (!fs.existsSync(inputPath)) {
  console.error('trayIcon.png not found');
  process.exit(1);
}

async function prepare() {
  try {
    const sharp = require('sharp');
    const img = await sharp(inputPath);
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

    // Create template: black shape on transparent (white shape -> black, black bg -> transparent)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const isBackground = r < 30 && g < 30 && b < 30;
      if (isBackground) {
        data[i + 3] = 0;
      } else {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }
    await sharp(data, { raw: info }).toFile(templatePath);
    console.log('Created trayIconTemplate.png');

    // Create light mode: invert colors (black shape on transparent for light taskbar)
    const lightData = await sharp(inputPath).negate({ alpha: false }).raw().toBuffer({ resolveWithObject: true });
    const { data: lightDataBuf, info: lightInfo } = lightData;
    for (let i = 0; i < lightDataBuf.length; i += 4) {
      if (lightDataBuf[i] > 250 && lightDataBuf[i + 1] > 250 && lightDataBuf[i + 2] > 250) {
        lightDataBuf[i + 3] = 0;
      }
    }
    await sharp(lightDataBuf, { raw: lightInfo }).toFile(lightPath);
    console.log('Created trayIconLight.png');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('Sharp not installed. Run: npm install --save-dev sharp');
      console.log('Copying trayIcon.png as trayIconTemplate.png for macOS.');
      fs.copyFileSync(inputPath, templatePath);
    } else {
      throw err;
    }
  }
}

prepare().catch(console.error);
