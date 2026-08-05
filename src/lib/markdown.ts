import type { Root } from "mdast";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type Processor } from "unified";

import { normalizeMarkdownResourceUrls } from "../pages/blog/@slug/markdownResources";
import rehypeCodeHighlight from "../pages/blog/@slug/plugins/codeHighlight";
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
 * 博客与巴别图书馆共用的 Markdown 渲染管线：
 * remarkParse → remarkGfm → 可选插件 → remarkCjkFriendly → remarkRehype →
 * rehypeLinkTarget → rehypeSanitize → rehypeCodeHighlight → rehypeHeadingId →
 * rehypeStringify。客户端与服务端使用完全相同的逻辑。
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
      .use(rehypeCodeHighlight)
      .use(rehypeHeadingId)
      .use(rehypeStringify)
      .process(normalizeMarkdownResourceUrls(content)),
  );
};
