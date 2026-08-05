import { fromBase62, toBase62 } from "./base62";
import { BOOKS_PER_HEXAGON, BOOKS_PER_SHELF, SHELVES_PER_WALL } from "./config";

export type DisplayableBookLocation = {
  /** base62 短编号形式的房间号。 */
  hexagon: string;
  wall: number;
  shelfOnWall: number;
  volume: number;
};

/** 由书架号计算 base62 图书编号，用于巴别图书馆的 hash 详情链接。 */
export const bookNumberCodeFromLocation = (
  location: DisplayableBookLocation,
): string => {
  const hexagon = fromBase62(location.hexagon);
  const shelf = location.wall * SHELVES_PER_WALL + location.shelfOnWall;
  const bookNumber =
    hexagon * BigInt(BOOKS_PER_HEXAGON) +
    BigInt(shelf * BOOKS_PER_SHELF + location.volume);

  return toBase62(bookNumber);
};

/** 超长编号（base62 或十进制）的省略显示。 */
export const ellipsizeCode = (digits: string, head = 48, tail = 24): string => {
  if (digits.length <= head + tail + 1) return digits;

  return `${digits.slice(0, head)}...${digits.slice(-tail)}`;
};

/** 图书位置的友好描述。 */
export const formatBookLocation = (
  location: DisplayableBookLocation,
  options: { truncateHexagon?: boolean } = {},
): string => {
  const hexagon = options.truncateHexagon
    ? ellipsizeCode(location.hexagon, 4, 4)
    : location.hexagon;

  return (
    `${hexagon}-` +
    `w${location.wall + 1}-` +
    `s${location.shelfOnWall + 1}-` +
    `v${location.volume + 1}`
  );
};
