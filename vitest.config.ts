import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 单元测试只收集 src 下的 *.test.ts；tests/ 目录留给 Playwright。
    include: ["src/**/*.test.ts"],
  },
});
