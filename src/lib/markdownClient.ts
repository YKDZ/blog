import type { Root } from "mdast";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type Processor } from "unified";

import { normalizeMarkdownResourceUrls } from "../pages/blog/@slug/markdownResources";
import rehypeHeadingId from "../pages/blog/@slug/plugins/headingId";
import rehypeLinkTarget from "../pages/blog/@slug/plugins/linkTarget";
import { remarkRemoveFirstHeading, sanitizeSchema } from "./markdownShared";

export type MarkdownRenderOptions = {
  /** 移除第一个标题（标题由外层组件单独展示）。 */
  removeFirstHeading?: boolean;
  /**
   * 额外挂载的处理器（例如博客文章专用的资源路径转换）。
   * 巴别图书馆等纯文本场景不需要传。
   */
  applyPlugin?: (processor: Processor<Root>) => void;
};

/**
 * 浏览器端 Markdown 渲染：与博客共用同一套管线，但不做代码高亮，
 * 因此不会把 shiki 及其语言集打进客户端。
 */
export const renderMarkdown = async (
  content: string,
  options: MarkdownRenderOptions = {},
): Promise<string> => {
  const processor = unified().use(remarkParse).use(remarkGfm);

  if (options.removeFirstHeading) processor.use(remarkRemoveFirstHeading);
  options.applyPlugin?.(processor);

  return String(
    await processor
      .use(remarkCjkFriendly)
      .use(remarkRehype)
      .use(rehypeLinkTarget)
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeHeadingId)
      .use(rehypeStringify)
      .process(normalizeMarkdownResourceUrls(content)),
  );
};
