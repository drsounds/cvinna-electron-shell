#!/usr/bin/env node
/**
 * Start the app. On macOS, uses dev .app bundle for native Dock icon.
 * Falls back to electron . if dev app unavailable.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const devAppPath = path.join(root, 'dev', 'cvinna-app.app');

function runElectron() {
  const { spawn: spawnNode } = require('child_process');
  const child = spawnNode('npx', ['electron', root, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: root,
    shell: true,
  });
  child.on('close', (code) => process.exit(code || 0));
}

async function main() {
  const isMac = process.platform === 'darwin';

  if (isMac) {
    if (!fs.existsSync(devAppPath)) {
      const { prepareDevApp } = require('./prepare-dev-app.js');
      const ok = await prepareDevApp();
      if (!ok) {
        console.log('Falling back to electron .');
        runElectron();
        return;
      }
    }
    const absDevApp = path.resolve(devAppPath);
    const child = spawn('open', ['-W', '-a', absDevApp], { stdio: 'inherit', cwd: root });
    child.on('close', (code) => process.exit(code || 0));
  } else {
    runElectron();
  }
}

main().catch((err) => {
  console.error(err);
  runElectron();
});
