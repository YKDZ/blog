import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

import { normalizeMarkdownResourceUrls } from "../pages/blog/@slug/markdownResources";
import { firstCharacters, textContent } from "./markdownShared";

export type MarkdownMetadata = {
  /** 第一个标题的纯文本；没有标题时为 undefined。 */
  title?: string;
  /** 第一个标题后的第一个段落（空白已归一化）；没有段落时为 undefined。 */
  description?: string;
};

export type MarkdownMetadataWithFallback = {
  title: string;
  description: string;
};

const markdownAst = (content: string): Root => {
  const processor = unified().use(remarkParse).use(remarkGfm);

  return processor.parse(normalizeMarkdownResourceUrls(content)) as Root;
};

/** 博客与巴别图书馆共用的标题/描述提取，一次解析同时得到两者。 */
export const metadataFromMarkdown = (content: string): MarkdownMetadata => {
  const tree = markdownAst(content);
  const firstHeadingIndex = tree.children.findIndex(
    (child) => child.type === "heading",
  );
  const heading =
    firstHeadingIndex === -1 ? undefined : tree.children[firstHeadingIndex];
  const title =
    heading === undefined
      ? undefined
      : textContent(heading).trim() || undefined;
  const description = tree.children
    .slice(firstHeadingIndex === -1 ? 0 : firstHeadingIndex + 1)
    .filter((child) => child.type === "paragraph")
    .map(textContent)
    .map((text) => text.replace(/\s+/g, " ").trim())
    .find(Boolean);

  return { title, description };
};

/** 提取第一个 Markdown 标题的纯文本。 */
export const firstMarkdownHeading = (content: string): string | undefined => {
  return metadataFromMarkdown(content).title;
};

const truncateDescription = (description: string, maxLength: number) => {
  if (description.length <= maxLength) return description;

  return `${description.slice(0, maxLength).trimEnd()}...`;
};

/** 提取摘要描述：第一个标题之后的第一个段落，空白归一化后截断。 */
export const descriptionFromMarkdown = (
  content: string,
  maxLength = 160,
): string | undefined => {
  const description = metadataFromMarkdown(content).description;

  if (description === undefined) return undefined;
  return truncateDescription(description, maxLength);
};

/**
 * 博客与巴别图书馆共用的标题/描述回退：
 * 没有标题时取开头 16 个字符，没有段落时取开头 50 个字符。
 */
export const metadataWithFallback = (
  content: string,
): MarkdownMetadataWithFallback => {
  const metadata = metadataFromMarkdown(content);

  return {
    title: metadata.title || firstCharacters(content, 16),
    description:
      metadata.description === undefined
        ? firstCharacters(content, 50)
        : truncateDescription(metadata.description, 160),
  };
};

/** 描述提取 + 开头 50 个字符回退。 */
export const descriptionWithFallback = (content: string): string => {
  return metadataWithFallback(content).description;
};
