import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

import { normalizeMarkdownResourceUrls } from "../pages/blog/@slug/markdownResources";
import { textContent } from "./markdownShared";

/**
 * 提取文章的摘要描述：第一个标题之后的第一个段落，
 * 空白归一化后截断到 160 个字符。没有可用的段落时返回 undefined。
 */
export const descriptionFromMarkdown = (
  content: string,
  maxLength = 160,
): string | undefined => {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(normalizeMarkdownResourceUrls(content)) as Root;
  const firstHeadingIndex = tree.children.findIndex(
    (child) => child.type === "heading",
  );
  const description = tree.children
    .slice(firstHeadingIndex === -1 ? 0 : firstHeadingIndex + 1)
    .filter((child) => child.type === "paragraph")
    .map(textContent)
    .map((text) => text.replace(/\s+/g, " ").trim())
    .find(Boolean);

  if (!description) return undefined;

  if (description.length <= maxLength) return description;

  return `${description.slice(0, maxLength).trimEnd()}...`;
};
