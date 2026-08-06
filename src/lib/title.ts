import { metadataWithFallback } from "./markdownMetadata";
import { firstCharacters } from "./markdownShared";

/** 巴别图书的标题：第一个 Markdown 标题，否则取最开头的 16 个字符。 */
export const bookTitle = (text: string): string => {
  return metadataWithFallback(text).title;
};

export { firstCharacters };
