import { expect, test } from '@playwright/test';

test('starter arena boots cleanly, starts, and advances deterministically', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  await page.goto('/?test=1&seed=42');

  const canvas = page.locator('#game-stage canvas');
  await expect(canvas).toBeVisible();

  const initialState = JSON.parse(await page.evaluate(() => window.render_game_to_text?.() ?? '{}'));
  expect(initialState.phase).toBe('menu');

  await page.click('#btn-start');
  const playingState = JSON.parse(await page.evaluate(() => window.render_game_to_text?.() ?? '{}'));
  expect(playingState.phase).toBe('playing');

  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.advanceTime?.(500));
  await page.keyboard.up('ArrowRight');

  const afterState = JSON.parse(await page.evaluate(() => window.render_game_to_text?.() ?? '{}'));
  expect(afterState.tick).toBeGreaterThanOrEqual(30);
  expect(afterState.player.x).toBeGreaterThan(playingState.player.x);

  // Touch overlay stays hidden on desktop mouse/keyboard sessions
  const touchActive = await page.locator('#app').getAttribute('data-touch-active');
  expect(touchActive).toBe('false');

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
