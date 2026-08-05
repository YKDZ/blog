import { expect, test } from "vitest";

import { bookTitle, firstCharacters, firstMarkdownHeadingText } from "./title";

test("firstCharacters 取最开头的 n 个 Unicode 字符并跳过前导空白", () => {
  expect(firstCharacters("你好，世界！", 4)).toBe("你好，世");
  expect(firstCharacters("  \nabc", 2)).toBe("ab");
  expect(firstCharacters("😀a", 1)).toBe("😀");
  expect(firstCharacters("", 16)).toBe("");
});

test("firstMarkdownHeadingText 提取第一个 ATX 标题", () => {
  expect(firstMarkdownHeadingText("# 标题\n正文")).toBe("标题");
  expect(firstMarkdownHeadingText("正文\n## 小节")).toBe("小节");
  expect(firstMarkdownHeadingText("正文\n没有标题")).toBeUndefined();
  expect(firstMarkdownHeadingText("#### 深标题 ")).toBe("深标题");
  expect(firstMarkdownHeadingText("### 标题 #")).toBe("标题");
  expect(firstMarkdownHeadingText("#")).toBeUndefined();
});

test("bookTitle 优先标题，否则回退到最开头的 16 个字符", () => {
  expect(bookTitle("# 有标题\n正文")).toBe("有标题");
  expect(bookTitle("没有标题的正文内容，一直写下去直到足够长")).toBe(
    "没有标题的正文内容，一直写下去直",
  );
  expect(bookTitle("")).toBe("");
});
