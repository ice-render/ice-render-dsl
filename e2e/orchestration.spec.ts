/**
 * 编排的端到端回归（真实浏览器）。
 *
 * 钉住的是"声明 → 真播放"这条链路：
 * 1. `autoplay` 生效：入场动画真的在跑（卡片透明度从 0 起来）；
 * 2. **错峰**：`each: 90` 生效 —— 第一张与最后一张的开始时刻明显不同；
 * 3. 运行时控制：暂停后值冻结、继续后接着走、重播回到起点再放一遍；
 * 4. 全程无 console/pageerror。
 */
import { test, expect, Page } from '@playwright/test';

let pageErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push('pageerror: ' + err.message.split('\n')[0]));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push('console.error: ' + msg.text().slice(0, 240));
  });
  await page.goto('/examples/orchestration.html');
  await page.waitForFunction(() => Boolean((window as any).__result?.orchestration), null, { timeout: 30_000 });
});

test.afterEach(() => {
  expect(pageErrors, `页面出现错误：\n${pageErrors.join('\n')}`).toEqual([]);
});

/** 读某张卡片的当前 opacity（引擎把动画写进 state）。 */
function opacityOf(page: Page, id: string) {
  return page.evaluate(
    (nodeId) => {
      const node = (window as any).__result.nodes.find((n: any) => n.state.id === nodeId);
      return node ? Number(node.state.opacity) : null;
    },
    id
  );
}

test('autoplay 生效：入场动画在跑，且卡片之间是错峰开始的', async ({ page }) => {
  // 入场刚开始：第一张已经在动、最后一张还没开始（each=90ms × 5 = 450ms 的错峰窗口）
  await page.waitForTimeout(120);
  const first = await opacityOf(page, 'card0');
  const last = await opacityOf(page, 'card5');
  expect(first, 'card0 的透明度应当已经开始上升').toBeGreaterThan(0);
  expect(last, 'card5 还没轮到（错峰窗口内）').toBeLessThan(first);

  // 播完：全部到位
  await page.waitForTimeout(1500);
  for (const id of ['card0', 'card5']) {
    expect(await opacityOf(page, id)).toBeCloseTo(1, 2);
  }
});

test('运行时控制：暂停冻结、继续接着走、重播回到起点', async ({ page }) => {
  await page.waitForTimeout(1500); // 先让它播完
  expect(await opacityOf(page, 'card0')).toBeCloseTo(1, 2);

  // 重播 → 回到起点再放
  await page.click('#btn-replay');
  await page.waitForTimeout(120);
  const afterReplay = await opacityOf(page, 'card0');
  expect(afterReplay, '重播后应当回到起点附近（透明度重新从 0 起来）').toBeLessThan(0.9);

  // 暂停 → 值冻结
  await page.click('#btn-pause');
  const paused = await opacityOf(page, 'card0');
  await page.waitForTimeout(400);
  expect(await opacityOf(page, 'card0'), '暂停期间透明度不应变化').toBeCloseTo(paused, 3);

  // 继续 → 接着走
  await page.click('#btn-resume');
  await page.waitForTimeout(900);
  expect(await opacityOf(page, 'card0'), '继续后应当继续推进到终态').toBeCloseTo(1, 2);

  // 停止 → 不再推进（值保持在停止时刻）
  await page.click('#btn-stop');
  await page.waitForTimeout(200);
  const stopped = await opacityOf(page, 'card0');
  await page.waitForTimeout(400);
  expect(await opacityOf(page, 'card0'), '停止后不应继续变化').toBeCloseTo(stopped, 3);
});
