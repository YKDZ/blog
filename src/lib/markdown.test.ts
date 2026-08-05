import { expect, test } from "vitest";

import { renderMarkdown } from "./markdown";
import { descriptionFromMarkdown } from "./markdownDescription";

test("renderMarkdown 渲染段落并可移除第一个标题", async () => {
  const html = await renderMarkdown("# 标题\n\n正文 *强调*", {
    removeFirstHeading: true,
  });

  expect(html).toContain("<p>正文 <em>强调</em></p>");
  expect(html).not.toContain("<h1");
});

test("renderMarkdown 默认保留标题", async () => {
  const html = await renderMarkdown("# 标题\n正文");

  expect(html).toContain("<h1");
  expect(html).toContain(">标题<");
});

test("renderMarkdown 代码块经过高亮", async () => {
  const html = await renderMarkdown("```ts\nconst a = 1;\n```");

  expect(html).toContain('<pre class="shiki');
  expect(html).toContain(">const<");
});

test("descriptionFromMarkdown 取第一个标题后的第一个段落", () => {
  expect(
    descriptionFromMarkdown("# 标题\n\n第一段 *强调* 内容。\n\n第二段。"),
  ).toBe("第一段 强调 内容。");
  expect(descriptionFromMarkdown("没有标题\n直接正文。")).toBe(
    "没有标题 直接正文。",
  );
  expect(descriptionFromMarkdown("# 只有标题")).toBeUndefined();
});

test("descriptionFromMarkdown 归一化空白并截断到 160 字符", () => {
  const longParagraph = `${"字".repeat(180)}`;
  const description = descriptionFromMarkdown(`# 标题\n\n${longParagraph}`);

  expect(description?.endsWith("...")).toBe(true);
  expect(description?.length).toBe(160 + 3);
});
