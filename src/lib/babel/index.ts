export {
  BASE_CHARSET,
  BOOKS_PER_HEXAGON,
  BOOKS_PER_SHELF,
  BORGES_CHARS_PER_LINE,
  BORGES_LINES_PER_PAGE,
  BORGES_PAGES_PER_BOOK,
  MAX_BOOK_LENGTH,
  SHELVES_PER_HEXAGON,
  SHELVES_PER_WALL,
} from "./config";
export { BASE62_ALPHABET, fromBase62, toBase62 } from "./base62";
export {
  assertTextInCharset,
  assertValidCharset,
  charsetFingerprint,
  charsetFromTexts,
} from "./charset";
export {
  createLibrary,
  type BabelLibrary,
  type BabelLibraryOptions,
  type BookItem,
  type BookLocation,
  type EnumerationOptions,
  type TextLocation,
} from "./library";
