import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

// 两个测试项目：node（解析器、排版包装层、命令行）和 browser（渲染器，Playwright + Chromium）。
// 文件名以 .browser.test.ts 结尾的测试跑在浏览器里，其余跑在 Node 里。
// 测试直接用源码（@mdmindmap/source 条件），不依赖先构建出 dist。Node 端走 SSR 解析，要单独设置。
const conditions = ["@mdmindmap/source"];
const resolve = { conditions };
const ssr = { resolve: { conditions } };

export default defineConfig({
  test: {
    projects: [
      {
        resolve,
        ssr,
        test: {
          name: "node",
          environment: "node",
          include: ["packages/*/test/**/*.test.ts"],
          exclude: ["**/*.browser.test.ts"],
        },
      },
      {
        resolve,
        // 预先打包，避免首次运行时 Vite 发现新依赖而重新加载测试。
        optimizeDeps: {
          include: ["@plait/layouts", "katex", "katex/contrib/mhchem"],
        },
        test: {
          name: "browser",
          include: ["packages/*/test/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
