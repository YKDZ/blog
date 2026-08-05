import { expect, test } from "vitest";

import { renderMarkdown } from "./markdownClient";

test("客户端渲染器保留段落并可移除第一个标题", async () => {
  const html = await renderMarkdown("# 标题\n\n正文 *强调*", {
    removeFirstHeading: true,
  });

  expect(html).toContain("<p>正文 <em>强调</em></p>");
  expect(html).not.toContain("<h1");
});

test("客户端渲染器不做代码高亮", async () => {
  const html = await renderMarkdown("```ts\nconst a = 1;\n```");

  expect(html).toContain("<pre><code");
  expect(html).not.toContain("shiki");
});
