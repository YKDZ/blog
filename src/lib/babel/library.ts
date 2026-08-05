import { fromBase62 } from "./base62";
import {
  assertTextInCharset,
  assertValidCharset,
  charsetFingerprint,
} from "./charset";
import {
  BASE_CHARSET,
  BOOKS_PER_HEXAGON,
  BOOKS_PER_SHELF,
  BORGES_CHARS_PER_LINE,
  BORGES_LINES_PER_PAGE,
  MAX_BOOK_LENGTH,
  SHELVES_PER_HEXAGON,
  SHELVES_PER_WALL,
} from "./config";
import { buildKmpAutomaton, type KmpAutomaton } from "./kmp";
import {
  PERMUTE_VERSION,
  permuteDigits,
  permuteRange,
  permuteRank,
  unpermuteDigits,
} from "./permute";

/** 一本书在巴别图书馆中的位置（房间坐标）。 */
export type BookLocation = {
  hexagon: bigint;
  /** 0..3：房间的四堵墙。 */
  wall: number;
  /** 0..19：房间内的书架序号。 */
  shelf: number;
  /** 0..4：书架在墙上的层数。 */
  shelfOnWall: number;
  /** 0..31：书在书架上的卷号。 */
  volume: number;
};

/** 书中某个字符的页码、行号与列号。 */
export type TextLocation = {
  page: number;
  line: number;
  column: number;
};

/** 枚举产物：图书编号 + 该书全文。 */
export type BookItem = {
  bookNumber: bigint;
  text: string;
};

export type BabelLibraryOptions = {
  /** 允许的书籍最小长度，默认 0（空书）。 */
  minLength?: number;
  /** 允许的书籍最大长度，默认取原版最大长度。 */
  maxLength?: number;
};

export type EnumerationOptions = {
  /** 只枚举长度不超过该值的书，默认取图书馆最大长度。 */
  maxLength?: number;
  /** 跳过前面的多少本。 */
  offset?: number;
  /** 最多产出多少本。 */
  limit?: number;
};

/** 精确计数时允许的 DP 工作量上限（长度 × 模式长度）。 */
const MAX_DP_WORK = 2_000_000;

const emptyGenerator = <T>(): Generator<T> => {
  return (function* () {})();
};

export type BabelLibrary = {
  readonly charset: readonly string[];
  readonly size: number;
  readonly minLength: number;
  readonly maxLength: number;
  /** 字符集指纹，标识该编号体系对应的图书馆版本。 */
  readonly fingerprint: string;
  /**
   * 长度为 n 的所有书的数量：Σ_{k=minLength}^{n-1} size^k。
   * offset(L) 正是“所有长度小于 L 的书”在全局编号中的起点。
   */
  offset: (length: number) => bigint;
  /** 窗口 W 内（长度 minLength..W）的书籍总数。 */
  totalBooks: (windowSize: number) => bigint;
  /**
   * 文本 → 图书编号（全局唯一整数，长度升序；同一长度内部经过可逆
   * 伪随机置换，使连号的书看起来互不相关）。
   */
  textToBookNumber: (text: string) => bigint;
  /** 图书编号 → 文本。 */
  bookNumberToText: (bookNumber: bigint | string) => string;
  /** 图书编号 → 文本长度。 */
  bookNumberToLength: (bookNumber: bigint | string) => number;
  bookLocation: (bookNumber: bigint | string) => BookLocation;
  /** 书架号（房间/墙/层/卷）→ 图书编号。 */
  bookNumberFromLocation: (location: {
    /** 房间号：内部使用 bigint，外部输入为 base62 短编号。 */
    hexagon: bigint | string;
    wall: number;
    shelfOnWall: number;
    volume: number;
  }) => bigint;
  /** 书中字符下标 → 页码/行号/列号。 */
  textLocation: (charOffset: number) => TextLocation;
  /**
   * 精确统计：长度不超过 maxLength 的书中，包含 pattern 的书有多少本。
   * 空模式返回窗口内全部书的总数。
   */
  countBooksContaining: (pattern: string, maxLength?: number) => bigint;
  /** 按长度统计：countsByLength(pattern, W)[L] 为长度为 L 且包含 pattern 的书数。 */
  countsByLength: (pattern: string, maxLength: number) => bigint[];
  /**
   * 惰性生成所有包含 pattern 的书（每本只出现一次）。顺序为：第一本
   * 是最短纯子串书（不足最短长度时用字符集首个字符补足），之后长度
   * 升序、同一长度内伪随机排列。空模式等价于按编号升序枚举窗口内的
   * 全部书。
   * 返回的数量级是 size^maxLength，永远无法穷尽，迭代器按需产出。
   */
  booksContaining: (
    pattern: string,
    options?: EnumerationOptions,
  ) => Generator<BookItem>;
  /** 惰性生成窗口 W 内（长度 minLength..W）的全部书，按全局编号升序。 */
  allBooks: (
    windowSize: number,
    options?: EnumerationOptions,
  ) => Generator<BookItem>;
  /**
   * 惰性枚举从指定图书编号开始的所有书（编号升序，直到图书馆尽头）。
   * 起始编号只做一次长度定位，后续编号递增时逐本还原置换后的文本，
   * 适合从任意书架号开始浏览。
   */
  booksFrom: (
    bookNumber: bigint | string,
    options?: EnumerationOptions,
  ) => Generator<BookItem>;
};

const asBigInt = (value: bigint | string): bigint => {
  if (typeof value === "bigint") return value;

  if (!/^\d+$/.test(value)) {
    throw new RangeError(`图书编号必须是十进制非负整数：${value}`);
  }

  return BigInt(value);
};

const assertNonNegative = (value: bigint): void => {
  if (value < 0n) throw new RangeError("图书编号不能为负数");
};

const assertLengthInRange = (
  length: number,
  minLength: number,
  maxLength: number,
): void => {
  if (length < minLength) {
    throw new RangeError(`文本长度 ${length} 小于图书馆最小长度 ${minLength}`);
  }

  if (length > maxLength) {
    throw new RangeError(`文本长度 ${length} 超过图书馆最大长度 ${maxLength}`);
  }
};

/**
 * 创建一座巴别图书馆。
 *
 * 编号规则：全局编号为单个非负整数。长度更短的书编号更小；
 * 同一长度内部按可逆伪随机置换排列，让连号的书看起来互不相关；
 * 每个长度的第一本（全为字符集首个字符）仍固定为该长度区间的
 * 第一本，因此 0 号书就是最短长度的“空格书”。
 */
export const createLibrary = (
  charset: readonly string[] = BASE_CHARSET,
  options: BabelLibraryOptions = {},
): BabelLibrary => {
  assertValidCharset(charset);

  const size = charset.length;
  const minLength = options.minLength ?? 0;
  const maxLength = options.maxLength ?? MAX_BOOK_LENGTH;

  if (!Number.isInteger(minLength) || minLength < 0) {
    throw new RangeError("最小长度必须是非负整数");
  }

  if (minLength > maxLength) {
    throw new RangeError(`最小长度 ${minLength} 不能超过最大长度 ${maxLength}`);
  }

  const charToIndex = new Map(charset.map((char, index) => [char, index]));
  const radix = BigInt(size);
  const offsetCache = new Map<number, bigint>();
  const permuteZeroCache = new Map<
    number,
    { zeroDigits: number[]; shiftDigits: number[] }
  >();

  const digitsToRank = (digits: readonly number[]): bigint => {
    let rank = 0n;

    for (const digit of digits) {
      rank = rank * radix + BigInt(digit);
    }

    return rank;
  };

  const addDigitsMod = (
    left: readonly number[],
    right: readonly number[],
  ): number[] => {
    const out = new Array<number>(left.length);
    let carry = 0;

    for (let i = left.length - 1; i >= 0; i--) {
      const sum = left[i]! + right[i]! + carry;
      out[i] = sum % size;
      carry = Math.floor(sum / size);
    }

    return out;
  };

  /**
   * 每个长度的置换零元与平移量（数字串形式）。
   * 平移保证排名 0 仍映射到 0，即每个长度的第一本书不变。
   */
  const permuteZero = (
    length: number,
  ): { zeroDigits: number[]; shiftDigits: number[] } => {
    const cached = permuteZeroCache.get(length);

    if (cached !== undefined) return cached;

    const zeroRank = permuteRank(0n, length, size);
    const domain = radix ** BigInt(length);
    const shift = (domain - zeroRank) % domain;
    const entry = {
      zeroDigits: digitsOfRank(zeroRank, length),
      shiftDigits: digitsOfRank(shift, length),
    };

    permuteZeroCache.set(length, entry);

    return entry;
  };

  /** 长度内部原始排名（数字串）→ 置换后排名（数字串）。 */
  const rankDigitsToPermutedDigits = (
    length: number,
    rankDigits: readonly number[],
  ): number[] => {
    if (length <= 1 || size === 1) return [...rankDigits];

    return addDigitsMod(
      permuteDigits(rankDigits, size),
      permuteZero(length).shiftDigits,
    );
  };

  /** 置换后排名（数字串）→ 长度内部原始排名（数字串）。 */
  const permutedDigitsToRankDigits = (
    length: number,
    permutedDigits: readonly number[],
  ): number[] => {
    if (length <= 1 || size === 1) return [...permutedDigits];

    return unpermuteDigits(
      addDigitsMod(permutedDigits, permuteZero(length).zeroDigits),
      size,
    );
  };

  const offset = (length: number): bigint => {
    if (length <= minLength) return 0n;

    const cached = offsetCache.get(length);

    if (cached !== undefined) return cached;

    const value =
      size === 1
        ? BigInt(length - minLength)
        : (radix ** BigInt(length) - radix ** BigInt(minLength)) /
          BigInt(size - 1);
    offsetCache.set(length, value);

    return value;
  };

  const patternIndices = (pattern: string): number[] => {
    assertTextInCharset(pattern, charset);

    return Array.from(pattern).map((char) => charToIndex.get(char)!);
  };

  const digitsToBookNumber = (digits: readonly number[]): bigint => {
    return (
      offset(digits.length) +
      digitsToRank(rankDigitsToPermutedDigits(digits.length, digits))
    );
  };

  const textToBookNumber = (text: string): bigint => {
    const chars = Array.from(text);
    assertLengthInRange(chars.length, minLength, maxLength);
    const rankDigits: number[] = [];

    for (const char of chars) {
      const index = charToIndex.get(char);

      if (index === undefined) {
        throw new RangeError(
          `字符 ${JSON.stringify(char)}（U+${char
            .codePointAt(0)
            ?.toString(16)
            .toUpperCase()}）不在图书馆字符集中`,
        );
      }

      rankDigits.push(index);
    }

    return (
      offset(chars.length) +
      digitsToRank(rankDigitsToPermutedDigits(chars.length, rankDigits))
    );
  };

  const bookNumberToLength = (value: bigint | string): number => {
    const number = asBigInt(value);
    assertNonNegative(number);

    if (number >= offset(maxLength + 1)) {
      throw new RangeError(`图书编号超出图书馆范围（最大长度 ${maxLength}）`);
    }

    let low = minLength;
    let high = maxLength + 1;

    while (low + 1 < high) {
      const mid = Math.floor((low + high) / 2);

      if (offset(mid) <= number) low = mid;
      else high = mid;
    }

    return low;
  };

  const bookNumberToText = (value: bigint | string): string => {
    const number = asBigInt(value);
    const length = bookNumberToLength(number);

    return permutedDigitsToRankDigits(
      length,
      digitsOfRank(number - offset(length), length),
    )
      .map((digit) => charset[digit])
      .join("");
  };

  const digitsOfRank = (rank: bigint, length: number): number[] => {
    const digits: number[] = [];

    for (let i = 0; i < length; i++) {
      digits.push(Number(rank % radix));
      rank /= radix;
    }

    return digits.reverse();
  };

  /** 数字串加一；发生进位回绕（已到该长度尽头）时返回 true。 */
  const incrementDigits = (digits: number[]): boolean => {
    let index = digits.length - 1;

    while (index >= 0 && digits[index] === size - 1) {
      digits[index] = 0;
      index--;
    }

    if (index < 0) return true;

    digits[index] = digits[index]! + 1;

    return false;
  };

  const bookLocation = (value: bigint | string): BookLocation => {
    const number = asBigInt(value);
    assertNonNegative(number);
    const booksPerHexagon = BigInt(BOOKS_PER_HEXAGON);
    const hexagon = number / booksPerHexagon;
    const inHexagon = Number(number % booksPerHexagon);
    const shelf = Math.floor(inHexagon / BOOKS_PER_SHELF);

    return {
      hexagon,
      wall: Math.floor(shelf / SHELVES_PER_WALL),
      shelf,
      shelfOnWall: shelf % SHELVES_PER_WALL,
      volume: inHexagon % BOOKS_PER_SHELF,
    };
  };

  const bookNumberFromLocation = (location: {
    hexagon: bigint | string;
    wall: number;
    shelfOnWall: number;
    volume: number;
  }): bigint => {
    const { hexagon, wall, shelfOnWall, volume } = location;
    const walls = SHELVES_PER_HEXAGON / SHELVES_PER_WALL;

    if (!Number.isInteger(wall) || wall < 0 || wall >= walls) {
      throw new RangeError(`墙必须在 0..${walls - 1} 之间`);
    }

    if (
      !Number.isInteger(shelfOnWall) ||
      shelfOnWall < 0 ||
      shelfOnWall >= SHELVES_PER_WALL
    ) {
      throw new RangeError(`层必须在 0..${SHELVES_PER_WALL - 1} 之间`);
    }

    if (!Number.isInteger(volume) || volume < 0 || volume >= BOOKS_PER_SHELF) {
      throw new RangeError(`卷必须在 0..${BOOKS_PER_SHELF - 1} 之间`);
    }

    const hex = typeof hexagon === "bigint" ? hexagon : fromBase62(hexagon);
    assertNonNegative(hex);
    const shelf = wall * SHELVES_PER_WALL + shelfOnWall;

    return (
      hex * BigInt(BOOKS_PER_HEXAGON) + BigInt(shelf * BOOKS_PER_SHELF + volume)
    );
  };

  const textLocation = (charOffset: number): TextLocation => {
    const charsPerPage = BORGES_LINES_PER_PAGE * BORGES_CHARS_PER_LINE;

    return {
      page: Math.floor(charOffset / charsPerPage),
      line: Math.floor((charOffset % charsPerPage) / BORGES_CHARS_PER_LINE),
      column: charOffset % BORGES_CHARS_PER_LINE,
    };
  };

  const countsByLength = (pattern: string, maxLength: number): bigint[] => {
    if (maxLength < 0) {
      throw new RangeError("窗口大小不能为负数");
    }

    if (maxLength > 5_000) {
      throw new RangeError("按长度统计仅支持不超过 5000 的窗口");
    }

    const indices = patternIndices(pattern);
    const m = indices.length;

    if (m === 0) {
      const powers: bigint[] = [];

      for (let length = 0; length <= maxLength; length++) {
        powers.push(length >= minLength ? radix ** BigInt(length) : 0n);
      }

      return powers;
    }

    if (m > maxLength) return new Array<bigint>(maxLength + 1).fill(0n);

    if (m * maxLength > MAX_DP_WORK) {
      throw new RangeError(
        `计数工作量过大（模式长度 ${m} × 窗口 ${maxLength}）` +
          "，请缩小窗口或使用更短的模式",
      );
    }

    const automaton = buildKmpAutomaton(indices, size);
    const suffix: bigint[][] = [
      (() => {
        const zero = new Array<bigint>(m + 1).fill(0n);
        zero[m] = 1n;
        return zero;
      })(),
    ];
    extendContainingSuffix(suffix, automaton, m, maxLength);
    const counts = new Array<bigint>(maxLength + 1).fill(0n);

    for (let length = 0; length <= maxLength; length++) {
      if (length >= minLength) counts[length] = suffix[length]![0]!;
    }

    return counts;
  };

  /** 逐步扩展“从各 KMP 状态出发、剩余 step 个字符里出现模式”的后缀计数。 */
  const extendContainingSuffix = (
    suffix: bigint[][],
    automaton: KmpAutomaton,
    patternLength: number,
    maxStep: number,
  ): void => {
    while (suffix.length <= maxStep) {
      const prev = suffix[suffix.length - 1]!;
      const step = new Array<bigint>(patternLength + 1).fill(0n);
      step[patternLength] = prev[patternLength]! * radix;

      for (let state = 0; state < patternLength; state++) {
        let sum = 0n;
        const row = state * size;

        for (let char = 0; char < size; char++) {
          sum += prev[automaton.delta[row + char]!]!;
        }

        step[state] = sum;
      }

      suffix.push(step);
    }
  };

  const countBooksContaining = (
    pattern: string,
    maxLength: number = MAX_BOOK_LENGTH,
  ): bigint => {
    if (maxLength < 0) throw new RangeError("窗口大小不能为负数");

    const indices = patternIndices(pattern);
    const m = indices.length;

    if (m === 0) return offset(maxLength + 1);

    if (m > maxLength) return 0n;

    if (m === 1) {
      const from = Math.max(1, minLength);

      if (maxLength < from) return 0n;

      const total = offset(maxLength + 1) - offset(from);
      const other = size - 1;
      const sumOther =
        other === 0
          ? 0n
          : other === 1
            ? BigInt(maxLength - from + 1)
            : (BigInt(other) ** BigInt(maxLength + 1) -
                BigInt(other) ** BigInt(from)) /
              BigInt(other - 1);

      return total - sumOther;
    }

    return countsByLength(pattern, maxLength).reduce(
      (sum, count) => sum + count,
      0n,
    );
  };

  const containingSeed = (
    indices: readonly number[],
    length: number,
  ): bigint => {
    let seed = 0x6a09e667bb67ae85n;

    for (const index of indices) {
      seed = ((seed ^ BigInt(index)) * 0x100000001b3n) & 0xffffffffffffffffn;
    }

    return seed ^ (BigInt(length) * 0x9e3779b97f4a7c15n);
  };

  const unrankContaining = (
    length: number,
    rank: bigint,
    automaton: KmpAutomaton,
    patternLength: number,
    suffix: bigint[][],
  ): number[] => {
    const digits = new Array<number>(length);
    let state = 0;

    for (let pos = 0; pos < length; pos++) {
      const remaining = length - pos - 1;
      const row = state * size;
      let chosen = -1;

      for (let char = 0; char < size; char++) {
        const next =
          state === patternLength
            ? patternLength
            : automaton.delta[row + char]!;
        const block = suffix[remaining]![next]!;

        if (rank < block) {
          chosen = char;
          state = next;
          break;
        }

        rank -= block;
      }

      if (chosen === -1) {
        throw new RangeError(`无法在长度 ${length} 中定位包含书的排名`);
      }

      digits[pos] = chosen;
    }

    return digits;
  };

  const rankContaining = (
    digits: readonly number[],
    length: number,
    automaton: KmpAutomaton,
    patternLength: number,
    suffix: bigint[][],
  ): bigint => {
    let rank = 0n;
    let state = 0;

    for (let pos = 0; pos < length; pos++) {
      const remaining = length - pos - 1;
      const row = state * size;
      const digit = digits[pos]!;

      for (let char = 0; char < digit; char++) {
        const next =
          state === patternLength
            ? patternLength
            : automaton.delta[row + char]!;
        rank += suffix[remaining]![next]!;
      }

      state =
        state === patternLength ? patternLength : automaton.delta[row + digit]!;
    }

    return rank;
  };

  const booksContaining = (
    pattern: string,
    options: EnumerationOptions = {},
  ): Generator<BookItem> => {
    const windowSize = options.maxLength ?? maxLength;

    if (windowSize < 0) throw new RangeError("窗口大小不能为负数");

    const indices = patternIndices(pattern);
    const m = indices.length;
    const startLength = Math.max(m, minLength);
    const upper = Math.min(windowSize, maxLength);

    if (upper < startLength) return emptyGenerator<BookItem>();

    if (m === 0) {
      return (function* () {
        let emitted = 0;
        let skipped = 0;

        for (const item of allBooks(Math.min(windowSize, maxLength))) {
          if (skipped < (options.offset ?? 0)) {
            skipped++;
            continue;
          }

          yield item;
          emitted++;

          if (options.limit !== undefined && emitted >= options.limit) return;
        }
      })();
    }

    const automaton = buildKmpAutomaton(indices, size);
    const suffix: bigint[][] = [
      (() => {
        const zero = new Array<bigint>(m + 1).fill(0n);
        zero[m] = 1n;
        return zero;
      })(),
    ];
    const pureDigits = Array.from(pattern).map((char) =>
      charToIndex.get(char)!,
    );

    if (pureDigits.length < minLength) {
      pureDigits.push(
        ...new Array<number>(minLength - pureDigits.length).fill(0),
      );
    }

    const makeBook = (digits: readonly number[]): BookItem => {
      return {
        bookNumber: digitsToBookNumber(digits),
        text: digits.map((digit) => charset[digit]).join(""),
      };
    };
    const limit = options.limit;
    const skip = options.offset ?? 0;

    return (function* () {
      let emitted = 0;
      let skipped = 0;

      const maybeEmit = (): boolean => {
        if (skipped < skip) {
          skipped++;
          return false;
        }

        emitted++;
        return true;
      };

      for (let length = startLength; length <= upper; length++) {
        extendContainingSuffix(suffix, automaton, m, length);
        const total = suffix[length]![0]!;
        const seed = containingSeed(indices, length);

        if (length === startLength) {
          const pureBook = makeBook(pureDigits);

          if (maybeEmit()) {
            yield pureBook;

            if (limit !== undefined && emitted >= limit) return;
          }

          const otherCount = total - 1n;
          const pureRank = rankContaining(
            pureDigits,
            pureDigits.length,
            automaton,
            m,
            suffix,
          );

          for (let index = 0n; index < otherCount; index++) {
            const permuted = permuteRange(index, otherCount, seed);
            const lexRank = permuted >= pureRank ? permuted + 1n : permuted;
            const item = makeBook(
              unrankContaining(length, lexRank, automaton, m, suffix),
            );

            if (maybeEmit()) {
              yield item;

              if (limit !== undefined && emitted >= limit) return;
            }
          }
        } else {
          for (let index = 0n; index < total; index++) {
            const lexRank = permuteRange(index, total, seed);
            const item = makeBook(
              unrankContaining(length, lexRank, automaton, m, suffix),
            );

            if (maybeEmit()) {
              yield item;

              if (limit !== undefined && emitted >= limit) return;
            }
          }
        }
      }
    })();
  };

  const allBooks = (
    windowSize: number,
    options: EnumerationOptions = {},
  ): Generator<BookItem> => {
    if (windowSize < 0) throw new RangeError("窗口大小不能为负数");
    if (windowSize > maxLength) {
      throw new RangeError(`窗口大小不能超过图书馆最大长度 ${maxLength}`);
    }

    if (windowSize < minLength) return emptyGenerator<BookItem>();

    const end = offset(windowSize + 1);

    return (function* () {
      let emitted = 0;
      let skipped = 0;

      for (const book of booksFrom(0n)) {
        if (book.bookNumber >= end) return;

        if (skipped < (options.offset ?? 0)) {
          skipped++;
          continue;
        }

        yield book;
        emitted++;

        if (options.limit !== undefined && emitted >= options.limit) return;
      }
    })();
  };

  const booksFrom = (
    value: bigint | string,
    options: EnumerationOptions = {},
  ): Generator<BookItem> => {
    const start = asBigInt(value);
    assertNonNegative(start);

    if (start >= offset(maxLength + 1)) {
      throw new RangeError(`图书编号超出图书馆范围（最大长度 ${maxLength}）`);
    }

    const limit = options.limit;
    const skip = options.offset ?? 0;

    return (function* () {
      let number = start;
      let length = bookNumberToLength(number);
      let permutedDigits = digitsOfRank(number - offset(length), length);
      let emitted = 0;
      let skipped = 0;

      while (number < offset(maxLength + 1)) {
        const text = permutedDigitsToRankDigits(length, permutedDigits)
          .map((digit) => charset[digit])
          .join("");

        if (skipped < skip) {
          skipped++;
        } else {
          yield { bookNumber: number, text };
          emitted++;

          if (limit !== undefined && emitted >= limit) return;
        }

        number++;

        if (incrementDigits(permutedDigits)) {
          length++;

          if (length > maxLength) return;

          permutedDigits = new Array<number>(length).fill(0);
        }
      }
    })();
  };

  return {
    charset,
    size,
    minLength,
    maxLength,
    fingerprint: charsetFingerprint(
      charset,
      maxLength,
      minLength,
      PERMUTE_VERSION,
    ),
    offset,
    totalBooks: (windowSize) => offset(windowSize + 1),
    textToBookNumber,
    bookNumberToText,
    bookNumberToLength,
    bookLocation,
    bookNumberFromLocation,
    textLocation,
    countBooksContaining,
    countsByLength,
    booksContaining,
    allBooks,
    booksFrom,
  };
};
