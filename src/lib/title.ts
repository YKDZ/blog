/** 取文本最开头的 n 个 Unicode 字符（跳过前导空白）。 */
export const firstCharacters = (text: string, count: number): string => {
  return Array.from(text.trimStart()).slice(0, count).join("");
};

/**
 * 用 ATX 标题语法提取 Markdown 的第一个标题（客户端安全，不依赖 AST）。
 * 与服务端基于 mdast 的提取规则等价于常见用例；没有标题时返回 undefined。
 */
export const firstMarkdownHeadingText = (text: string): string | undefined => {
  const match = /^#{1,6}\s+(.+?)\s*#*\s*$/m.exec(text);

  return match?.[1]?.trim() || undefined;
};

/** 巴别图书的标题：第一个 Markdown 标题，否则取最开头的 16 个字符。 */
export const bookTitle = (text: string, fallbackLength = 16): string => {
  return (
    firstMarkdownHeadingText(text) || firstCharacters(text, fallbackLength)
  );
};
