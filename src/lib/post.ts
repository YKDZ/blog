import { metadataWithFallback } from "./markdownMetadata";

export type PostCardItem = {
  title: string;
  href: string;
  description?: string;
  /** 卡片顶部的辅助行（日期、长度等）。 */
  time?: string;
};

export type BookMetadata = {
  title: string;
  description: string;
};

/** 巴别图书的标题与描述：与博客共用同一份 Markdown 元数据提取逻辑。 */
export const bookMetadata = (text: string): BookMetadata => {
  return metadataWithFallback(text);
};

/**
 * 巴别图书的描述：与正常文章一样提取第一个标题后的第一个段落；
 * 没有段落时回退到文本最开头的 50 个字符。
 */
export const bookDescription = (text: string): string => {
  return bookMetadata(text).description;
};
