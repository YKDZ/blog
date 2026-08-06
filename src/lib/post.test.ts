import { expect, test } from "vitest";

import { bookDescription, bookMetadata } from "./post";

test("bookDescription 优先段落描述", () => {
  expect(bookDescription("# 标题\n\n第一段描述。")).toBe("第一段描述。");
});

test("bookDescription 无段落时回退到前 50 个字符", () => {
  const text = Array.from({ length: 30 }, (_, i) => `# 标题${i}`).join("\n");
  const description = bookDescription(text);

  expect(description.length).toBe(50);
  expect(description).toBe(Array.from(text.trimStart()).slice(0, 50).join(""));
});

test("bookMetadata 与博客共用标题和描述提取", () => {
  expect(bookMetadata("# 标题 \\_ \\* \\\\\n\n第一段 *强调*。")).toEqual({
    title: "标题 _ * \\",
    description: "第一段 强调。",
  });
});

test("bookMetadata 的描述与博客一样截断到 160 字符", () => {
  const longParagraph = `${"字".repeat(180)}`;
  const metadata = bookMetadata(`# 标题\n\n${longParagraph}`);

  expect(metadata.description.endsWith("...")).toBe(true);
  expect(metadata.description.length).toBe(160 + 3);
});
