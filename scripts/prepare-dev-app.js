#!/usr/bin/env node
/**
 * Creates a macOS dev .app bundle with our icon so Dock shows native styling.
 * Run on macOS before npm start. Falls back to electron . if preparation fails.
 */
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const devAppPath = path.join(root, 'dev', 'cvinna-app.app');

function getElectronAppPath() {
  try {
    const electronPath = require('electron');
    // electronPath = .../dist/Electron.app/Contents/MacOS/Electron
    return path.join(path.dirname(electronPath), '..', '..');
  } catch {
    return null;
  }
}

async function createIcns(iconPath) {
  const buildDir = path.join(root, 'build');
  fs.mkdirSync(buildDir, { recursive: true });

  const iconGen = require('icon-gen');
  await iconGen(iconPath, buildDir, {
    report: false,
    icns: { name: 'icon', sizes: [16, 32, 64, 128, 256, 512, 1024] },
  });
  return path.join(buildDir, 'icon.icns');
}

function prepareDevApp() {
  if (process.platform !== 'darwin') {
    console.log('prepare-dev-app: macOS only, skipping');
    return Promise.resolve(false);
  }

  const iconPath = fs.existsSync(path.join(root, 'DesktopAppIcon.svg'))
    ? path.join(root, 'DesktopAppIcon.svg')
    : path.join(root, 'icon.png');
  if (!fs.existsSync(iconPath)) {
    console.log('prepare-dev-app: icon not found, run prepare:icons first');
    return Promise.resolve(false);
  }

  const electronApp = getElectronAppPath();
  if (!electronApp || !fs.existsSync(electronApp)) {
    console.log('prepare-dev-app: Electron not installed, run: pnpm install');
    return Promise.resolve(false);
  }

  const buildDir = path.join(root, 'build');
  fs.mkdirSync(buildDir, { recursive: true });

  const icnsPath = path.join(buildDir, 'icon.icns');
  if (!fs.existsSync(icnsPath)) {
    console.log('Creating icon.icns...');
  }

  return createIcns(iconPath)
      .then(() => {
        console.log('Copying Electron.app to dev/cvinna-app.app...');
        const devDir = path.join(root, 'dev');
        if (fs.existsSync(devAppPath)) {
          fs.rmSync(devAppPath, { recursive: true });
        }
        fs.mkdirSync(devDir, { recursive: true });
        fs.cpSync(electronApp, devAppPath, { recursive: true });

        // Replace icon
        const destIcns = path.join(devAppPath, 'Contents', 'Resources', 'electron.icns');
        fs.copyFileSync(icnsPath, destIcns);

        // Write app path for launcher
        const appPathFile = path.join(devAppPath, 'Contents', 'Resources', 'app-path.txt');
        fs.writeFileSync(appPathFile, root, 'utf8');

        // Create launcher script
        const macosDir = path.join(devAppPath, 'Contents', 'MacOS');
        const electronBin = path.join(macosDir, 'Electron');
        const launcherPath = path.join(macosDir, 'cvinna-app');

        const launcherScript = `#!/bin/bash
APP_PATH="$(cat "$(dirname "$0")/../Resources/app-path.txt")"
exec "$(dirname "$0")/Electron" "$APP_PATH" "$@"
`;
        fs.writeFileSync(launcherPath, launcherScript, 'utf8');
        fs.chmodSync(launcherPath, 0o755);

        // Update Info.plist
        const plistPath = path.join(devAppPath, 'Contents', 'Info.plist');
        let plist = fs.readFileSync(plistPath, 'utf8');
        plist = plist.replace(/<key>CFBundleExecutable<\/key>\s*<string>Electron<\/string>/,
          '<key>CFBundleExecutable</key><string>cvinna-app</string>');
        plist = plist.replace(/<key>CFBundleName<\/key>\s*<string>Electron<\/string>/,
          '<key>CFBundleName</key><string>CVinna</string>');
        plist = plist.replace(/<key>CFBundleDisplayName<\/key>\s*<string>Electron<\/string>/,
          '<key>CFBundleDisplayName</key><string>CVinna</string>');
        plist = plist.replace(/<key>CFBundleIconFile<\/key>\s*<string>[^<]*<\/string>/,
          '<key>CFBundleIconFile</key><string>electron.icns</string>');
        fs.writeFileSync(plistPath, plist);

        console.log('Dev app ready at dev/cvinna-app.app');
        return true;
      });
}

function run() {
  prepareDevApp()
    .then((ok) => { process.exit(ok ? 0 : 1); })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

// Support both direct run and require
if (require.main === module) {
  run();
} else {
  module.exports = { prepareDevApp, getElectronAppPath };
}
