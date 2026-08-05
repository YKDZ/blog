import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { BLOGS_DIR } from "../../pages/blog/@slug/lib";
import { charsetFromTexts } from "./charset";
import { createLibrary, type BabelLibrary, type BookLocation } from "./library";

/** 读取 public/blogs 下全部文章的原始 Markdown 文本（按目录名排序）。 */
export const blogTexts = async (): Promise<string[]> => {
  const entries = await readdir(BLOGS_DIR, { withFileTypes: true });
  const dirnames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    dirnames.map((dirname) =>
      readFile(resolve(BLOGS_DIR, dirname, "index.md"), "utf-8"),
    ),
  );
};

/** 由全部文章构造扩展字符集：原版字符集 + 文章中出现过的所有 Unicode 字符。 */
export const blogCharset = async (): Promise<string[]> => {
  return charsetFromTexts(await blogTexts());
};

let libraryPromise: Promise<BabelLibrary> | undefined;

/** 构建以全部文章字符集为准的巴别图书馆，最小长度取最短博客文章的长度。 */
export const blogLibrary = (): Promise<BabelLibrary> => {
  libraryPromise ??= (async () => {
    const texts = await blogTexts();
    const minLength = Math.min(...texts.map((text) => Array.from(text).length));

    return createLibrary(charsetFromTexts(texts), { minLength });
  })();

  return libraryPromise;
};

export type ArticleBabelSummary = {
  length: number;
  bookNumber: string;
  location: BookLocation;
};

/** 计算一篇（原始文本）文章在图书馆中的编号与位置。 */
export const articleBabelSummary = (
  library: BabelLibrary,
  content: string,
): ArticleBabelSummary => {
  const bookNumber = library.textToBookNumber(content);

  return {
    length: Array.from(content).length,
    bookNumber: bookNumber.toString(),
    location: library.bookLocation(bookNumber),
  };
};
