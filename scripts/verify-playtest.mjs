#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREENSHOT_PATH = path.join(ROOT_DIR, 'test-results', 'playtest-smoke.png');
const useDev = process.argv.includes('--dev');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      srv.close(() => {
        if (addr && typeof addr === 'object') resolve(addr.port);
        else reject(new Error('Could not resolve free port'));
      });
    });
  });
}

async function waitForUrl(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Server still starting
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

async function launchBrowser() {
  const attempts = [
    process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {},
    { channel: 'chrome' },
    { channel: 'msedge' },
  ];

  let lastError;
  for (const opts of attempts) {
    try {
      return await chromium.launch({ headless: true, ...opts });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function stopServer(child) {
  if (!child || child.killed) return;
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

async function main() {
  if (!useDev && !fs.existsSync(path.join(ROOT_DIR, 'dist', 'index.html'))) {
    console.error('Missing dist/index.html. Run `npm run build` before `npm run verify:browser`.');
    process.exit(1);
  }

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const viteCli = path.join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  const serverArgs = useDev
    ? [viteCli, '--port', String(port), '--host', '127.0.0.1', '--strictPort']
    : [viteCli, 'preview', '--port', String(port), '--host', '127.0.0.1', '--strictPort'];

  const server = spawn(process.execPath, serverArgs, {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let browser;
  try {
    await waitForUrl(baseUrl);
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto(`${baseUrl}/?test=1&seed=42`, { waitUntil: 'networkidle' });

    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('#game-stage canvas');
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        width: canvas.width,
        height: canvas.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
      };
    });

    if (!canvasInfo || canvasInfo.width <= 0 || canvasInfo.height <= 0) {
      throw new Error(`Canvas missing or zero-sized: ${JSON.stringify(canvasInfo)}`);
    }

    const initialRaw = await page.evaluate(() => window.render_game_to_text?.() ?? '');
    if (!initialRaw) {
      throw new Error('window.render_game_to_text() returned empty string');
    }
    const initialState = JSON.parse(initialRaw);
    if (initialState.phase !== 'menu') {
      throw new Error(`Expected initial phase "menu", got "${initialState.phase}"`);
    }

    await page.click('#btn-start');
    const startedState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (startedState.phase !== 'playing') {
      throw new Error(`Expected phase "playing" after clicking #btn-start, got "${startedState.phase}"`);
    }

    const startX = startedState.player.x;
    await page.keyboard.down('ArrowRight');
    await page.evaluate(() => window.advanceTime?.(500));
    await page.keyboard.up('ArrowRight');

    const afterState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (afterState.tick < 30) {
      throw new Error(`Expected tick >= 30 after advanceTime(500), got ${afterState.tick}`);
    }
    if (afterState.player.x <= startX) {
      throw new Error(`Expected player.x (${afterState.player.x}) > startX (${startX}) after ArrowRight`);
    }

    fs.mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true });
    const pngBuffer = await page.screenshot({ path: SCREENSHOT_PATH });
    if (pngBuffer.length < 1024) {
      throw new Error(`Screenshot unexpectedly tiny (${pngBuffer.length} bytes), canvas may be blank.`);
    }

    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      throw new Error(
        `Browser errors detected!\nConsole errors: ${JSON.stringify(consoleErrors)}\nPage errors: ${JSON.stringify(pageErrors)}`,
      );
    }

    console.log(
      `[PASS] Browser playtest verified (${afterState.engine}): tick=${afterState.tick}, ` +
        `player=(${afterState.player.x},${afterState.player.y}), 0 console/page errors, ` +
        `screenshot=${path.relative(ROOT_DIR, SCREENSHOT_PATH)}`,
    );
  } finally {
    if (browser) await browser.close();
    stopServer(server);
  }
}

main().catch((err) => {
  console.error('[FAIL] Browser playtest verification failed:', err);
  process.exit(1);
});
