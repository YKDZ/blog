/**
 * 《巴别图书馆》原版的生成规则。
 *
 * 故事中每本书固定为 410 页 × 每页 40 行 × 每行 80 个符号，
 * 因此原版书籍的最大长度为 1_312_000 个字符。
 */
export const BORGES_PAGES_PER_BOOK = 410;
export const BORGES_LINES_PER_PAGE = 40;
export const BORGES_CHARS_PER_LINE = 80;
export const MAX_BOOK_LENGTH =
  BORGES_PAGES_PER_BOOK * BORGES_LINES_PER_PAGE * BORGES_CHARS_PER_LINE;

/**
 * 原版字符集。
 *
 * 博尔赫斯的故事中写道，图书馆的拼写符号是 25 个：逗号、句号、空格和
 * 22 个字母。这里采用 libraryofbabel.info 实现所约定的 29 个符号版本
 * （26 个小写字母 + 空格 + 逗号 + 句号），如需严格遵循故事的 25 个符号，
 * 替换此常量即可。字符顺序即编号的字典序。
 */
export const BASE_CHARSET = [
  " ",
  ",",
  ".",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
] as const;

/** 每个房间有 20 个书架：四堵墙，每堵墙 5 层。 */
export const SHELVES_PER_HEXAGON = 20;
export const SHELVES_PER_WALL = 5;
/** 每个书架放 32 本书。 */
export const BOOKS_PER_SHELF = 32;
export const BOOKS_PER_HEXAGON = SHELVES_PER_HEXAGON * BOOKS_PER_SHELF;
