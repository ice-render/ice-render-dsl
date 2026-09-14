import { defineConfig } from '@playwright/test';

/**
 * 示例页端到端配置（真实浏览器验证）。
 *
 * 前置：`npm run build`（示例页加载 `../dist/index.umd.js` 与 `../node_modules/ice-render/dist/index.umd.js`）。
 *
 * 端口与家族其余仓错开：ice-render 8090 / ice-entity-designer 8091 / ice-chart 5177 /
 * ice-web-components 8093 —— 这里用 8094。
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  reporter: [['list']],
  webServer: {
    command: 'npx http-server . -p 8094 -c-1 --silent',
    port: 8094,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://localhost:8094',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  },
});
