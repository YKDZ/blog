import { descriptionFromMarkdown } from "./markdownDescription";
import { firstCharacters } from "./title";

export type PostCardItem = {
  title: string;
  href: string;
  description?: string;
  /** 卡片顶部的辅助行（日期、长度等）。 */
  time?: string;
};

/**
 * 巴别图书的描述：与正常文章一样提取第一个标题后的第一个段落；
 * 没有段落时回退到文本最开头的 50 个字符。
 */
export const bookDescription = (text: string): string => {
  return descriptionFromMarkdown(text) ?? firstCharacters(text, 50);
};
