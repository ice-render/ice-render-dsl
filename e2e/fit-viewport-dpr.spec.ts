/**
 * `fitViewport` 的 dpr 回归（真实浏览器）。
 *
 * 缺陷的形态：视口尺寸原先取 `ice.canvasWidth/canvasHeight` —— 那是 **backing store**
 * 尺寸（= css × dpr），而渲染视口还会再乘一次 dpr。于是 `options.dpr > 1` 时
 * scale 被多乘一次：内容画成两倍大、四周被裁掉，**且不报错** ——
 * 普通屏上完全正常，只有高分屏会复发（所以它能在仓库里躺很久）。
 *
 * 判据用**独立预言机**：在页面里按内容包围盒 + CSS 尺寸重算一遍期望 scale，
 * 并比较 dpr = 1 / 2 两条路径的 viewport 是否逐字段一致 —— 而不是"跑一下没报错"。
 */
import { test, expect, Page } from '@playwright/test';

let pageErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push('pageerror: ' + err.message.split('\n')[0]));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push('console.error: ' + msg.text().slice(0, 240));
  });
  await page.goto('/examples/core-dsl.html');
});

test.afterEach(() => {
  expect(pageErrors, `页面出现错误：\n${pageErrors.join('\n')}`).toEqual([]);
});

/** 在页面里用给定 dpr 渲染同一份文档，回传 viewport 与"独立重算"的期望值。 */
function fitWith(page: Page, dpr: number) {
  return page.evaluate((devicePixelRatioOfCanvas) => {
    const CSS_WIDTH = 800;
    const CSS_HEIGHT = 500;
    const PADDING = 40;

    const canvas = document.createElement('canvas');
    canvas.style.width = CSS_WIDTH + 'px';
    canvas.style.height = CSS_HEIGHT + 'px';
    document.body.appendChild(canvas);

    const doc: any = {
      schemaVersion: 1,
      options: { dpr: devicePixelRatioOfCanvas, fitViewport: true, fitViewportPadding: PADDING },
      nodes: [
        { id: 'a', type: 'rect', left: 0, top: 0, width: 200, height: 100 },
        { id: 'b', type: 'rect', left: 900, top: 700, width: 200, height: 100 },
      ],
      edges: [{ source: 'a', target: 'b' }],
    };
    const result: any = (window as any).ICEDSL.renderDsl(canvas, doc);

    // 独立预言机：按内容包围盒 + CSS 尺寸重算期望（不读实现里的任何中间值）
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    result.nodes.forEach((node: any) => {
      const box = node.getMinBoundingBox(true).getMinAndMaxPoint();
      minX = Math.min(minX, box.minX);
      minY = Math.min(minY, box.minY);
      maxX = Math.max(maxX, box.maxX);
      maxY = Math.max(maxY, box.maxY);
    });
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const expectedScale = Math.min(
      Math.max(1, CSS_WIDTH - PADDING * 2) / contentWidth,
      Math.max(1, CSS_HEIGHT - PADDING * 2) / contentHeight,
      1
    );
    const expectedTx = (CSS_WIDTH - contentWidth * expectedScale) / 2 - minX * expectedScale;
    const expectedTy = (CSS_HEIGHT - contentHeight * expectedScale) / 2 - minY * expectedScale;

    // 再用 worldToScreen 把内容四角投影到屏幕，确认真的落在画布里（不是"算了个数就完事"）
    const corners = [
      [minX, minY],
      [maxX, maxY],
    ].map(([wx, wy]) => result.ice.worldToScreen(wx, wy));

    return {
      viewport: { ...result.ice.viewport },
      expected: { scale: expectedScale, tx: expectedTx, ty: expectedTy },
      corners,
      cssSize: { width: CSS_WIDTH, height: CSS_HEIGHT },
    };
  }, dpr);
}

test('fitViewport 在 dpr = 2 下与 dpr = 1 取景一致（不能按 backing store 算）', async ({ page }) => {
  const at1 = await fitWith(page, 1);
  const at2 = await fitWith(page, 2);

  // ① 与独立预言机一致
  expect(at1.viewport.scale).toBeCloseTo(at1.expected.scale, 5);
  expect(at2.viewport.scale).toBeCloseTo(at2.expected.scale, 5);
  expect(at2.viewport.tx).toBeCloseTo(at2.expected.tx, 4);
  expect(at2.viewport.ty).toBeCloseTo(at2.expected.ty, 4);

  // ② 只改 dpr，取景必须逐字段一致
  expect(at2.viewport.scale).toBeCloseTo(at1.viewport.scale, 6);
  expect(at2.viewport.tx).toBeCloseTo(at1.viewport.tx, 4);
  expect(at2.viewport.ty).toBeCloseTo(at1.viewport.ty, 4);

  // ③ 反证：按 backing store 算会把 scale 顶到 1（这里内容比画布大，正确的 scale < 1）
  expect(at2.viewport.scale).toBeLessThan(1);
});

test('fitViewport 后内容四角真的落在画布 CSS 区域内（dpr = 2）', async ({ page }) => {
  const at2 = await fitWith(page, 2);
  at2.corners.forEach(([sx, sy]) => {
    expect(sx).toBeGreaterThanOrEqual(-0.5);
    expect(sy).toBeGreaterThanOrEqual(-0.5);
    expect(sx).toBeLessThanOrEqual(at2.cssSize.width + 0.5);
    expect(sy).toBeLessThanOrEqual(at2.cssSize.height + 0.5);
  });
});
