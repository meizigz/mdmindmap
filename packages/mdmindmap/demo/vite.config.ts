import { defaultClientConditions, defineConfig } from "vite";

// 演示页直接用核心库源码（与测试、插件构建相同的 @mdmindmap/source 条件）。
export default defineConfig({
  resolve: { conditions: ["@mdmindmap/source", ...defaultClientConditions] },
});
