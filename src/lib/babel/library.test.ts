import { expect, test } from "vitest";

import {
  articleBabelSummary,
  blogCharset,
  blogLibrary,
  blogTexts,
} from "./articles";
import { fromBase62, toBase62 } from "./base62";
import {
  assertTextInCharset,
  assertValidCharset,
  charsetFingerprint,
  charsetFromTexts,
} from "./charset";
import { BASE_CHARSET, BOOKS_PER_HEXAGON, MAX_BOOK_LENGTH } from "./config";
import { createLibrary } from "./library";
import { PERMUTE_VERSION } from "./permute";

const allTextsUpTo = (charset: readonly string[], window: number): string[] => {
  const texts: string[] = [];

  for (let length = 0; length <= window; length++) {
    if (length === 0) {
      texts.push("");
      continue;
    }

    const digits = new Array<string>(length);
    const stack: Array<{ pos: number; charIndex: number }> = [
      { pos: 0, charIndex: 0 },
    ];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;

      if (frame.charIndex >= charset.length) {
        stack.pop();
        continue;
      }

      const char = charset[frame.charIndex++]!;
      digits[frame.pos] = char;

      if (frame.pos === length - 1) {
        texts.push(digits.join(""));
      } else {
        stack.push({ pos: frame.pos + 1, charIndex: 0 });
      }
    }
  }

  return texts;
};

test("扩展字符集：原版字符在前，其余按码点升序且去重", () => {
  const charset = charsetFromTexts(["a中a😀", "b中"]);

  expect(charset.slice(0, BASE_CHARSET.length)).toEqual(BASE_CHARSET);
  expect(charset).toContain("中");
  expect(charset).toContain("😀");
  expect(charset).toContain("b");
  expect(new Set(charset).size).toBe(charset.length);
  expect(Array.from(charset).filter((c) => c === "a")).toHaveLength(1);
});

test("字符集指纹稳定且随字符集变化", () => {
  const fingerprint = charsetFingerprint(["a", "b"], 10);

  expect(fingerprint).toBe(charsetFingerprint(["a", "b"], 10));
  expect(fingerprint).not.toBe(charsetFingerprint(["b", "a"], 10));
  expect(fingerprint).not.toBe(charsetFingerprint(["a", "b"], 11));
});

test("非法字符集被拒绝", () => {
  expect(() => createLibrary([])).toThrow();
  expect(() => createLibrary(["a", "a"])).toThrow();
  expect(() => assertValidCharset(["ab"])).toThrow();
  expect(() => assertTextInCharset("a中", ["a", "b"])).toThrow(
    /不在图书馆字符集/,
  );
});

test("二元字符集的编号规则（同长度内为可逆置换）", () => {
  const library = createLibrary(["a", "b"], { maxLength: 10 });

  expect(library.textToBookNumber("")).toBe(0n);
  expect(library.textToBookNumber("a")).toBe(1n);
  expect(library.textToBookNumber("b")).toBe(2n);
  expect(library.textToBookNumber("aa")).toBe(3n);
  expect(library.textToBookNumber("ab")).toBe(6n);
  expect(library.textToBookNumber("ba")).toBe(5n);
  expect(library.textToBookNumber("bb")).toBe(4n);
  expect(library.bookNumberToText(0n)).toBe("");
  expect(library.bookNumberToText(4n)).toBe("bb");
  expect(library.bookNumberToLength(4n)).toBe(2);
});

test("Unicode 字符集的编解码往返", () => {
  const library = createLibrary(["a", "中", "😀"], { maxLength: 20 });
  const texts = ["", "a", "中", "😀", "a中😀", "😀中a中", "中中中"];

  for (const text of texts) {
    const number = library.textToBookNumber(text);

    expect(library.bookNumberToText(number)).toBe(text);
    expect(library.bookNumberToLength(number)).toBe(Array.from(text).length);
  }
});

test("base62 短编号与十进制编号是同一个整数", () => {
  for (const number of [0n, 1n, 61n, 62n, 3844n]) {
    const code = toBase62(number);

    expect(code).toMatch(/^[0-9A-Za-z]+$/);
    expect(fromBase62(code)).toBe(number);
  }

  expect(toBase62(0n)).toBe("0");
  expect(toBase62(62n)).toBe("10");
  expect(() => fromBase62("1-2")).toThrow(/非法字符/);
  expect(() => fromBase62("")).toThrow(/不能为空/);
});

test("短编号长文比十进制短得多且可还原", async () => {
  const texts = await blogTexts();
  const library = createLibrary(await blogCharset());
  const shortest = texts.reduce((a, b) => (a.length <= b.length ? a : b));
  const number = library.textToBookNumber(shortest);
  const decimal = number.toString();
  const code = toBase62(number);

  expect(code.length).toBeLessThan(decimal.length * 0.56);
  expect(fromBase62(code)).toBe(number);
});

test("allBooks 按编号升序枚举窗口内的全部书", () => {
  const library = createLibrary(["a", "b", "c"], { maxLength: 10 });
  const books = [...library.allBooks(3)];

  expect(books).toHaveLength(40);

  for (let i = 0; i < books.length; i++) {
    const book = books[i]!;

    if (i > 0)
      expect(book.bookNumber).toBeGreaterThan(books[i - 1]!.bookNumber);
    expect(library.bookNumberToText(book.bookNumber)).toBe(book.text);
  }

  const firstLengths = books.slice(0, 5).map((book) => book.text.length);
  expect(firstLengths).toEqual([0, 1, 1, 1, 2]);
});

test("allBooks 支持 offset 与 limit", () => {
  const library = createLibrary(["a", "b"], { maxLength: 10 });
  const all = [...library.allBooks(3)];
  const windowed = [...library.allBooks(3, { offset: 5, limit: 7 })];

  expect(windowed.map((book) => book.bookNumber)).toEqual(
    all.slice(5, 12).map((book) => book.bookNumber),
  );
});

test("一元字符集（size=1）的退化情况", () => {
  const library = createLibrary(["a"], { maxLength: 10 });

  expect(library.offset(3)).toBe(3n);
  expect(library.textToBookNumber("aaa")).toBe(3n);
  expect(library.bookNumberToText(3n)).toBe("aaa");
  expect([...library.allBooks(3)]).toHaveLength(4);
  expect(library.countBooksContaining("a", 5)).toBe(5n);
});

test("最小长度大于 0 时编号从最短长度开始", () => {
  const library = createLibrary(["a", "b"], { minLength: 2, maxLength: 4 });

  expect(library.minLength).toBe(2);
  expect(library.textToBookNumber("aa")).toBe(0n);
  expect(library.textToBookNumber("ab")).toBe(3n);
  expect(library.textToBookNumber("ba")).toBe(2n);
  expect(library.textToBookNumber("bb")).toBe(1n);
  expect(library.textToBookNumber("aaa")).toBe(4n);
  expect(library.bookNumberToText(0n)).toBe("aa");
  expect(library.bookNumberToText(4n)).toBe("aaa");
  expect(() => library.textToBookNumber("a")).toThrow(/小于图书馆最小长度/);
  expect(() => library.textToBookNumber("")).toThrow(/小于图书馆最小长度/);
  expect(library.offset(2)).toBe(0n);
  expect(library.offset(3)).toBe(4n);
  expect(library.totalBooks(1)).toBe(0n);
  expect(library.totalBooks(2)).toBe(4n);
  expect(library.totalBooks(3)).toBe(12n);
  expect([...library.allBooks(1)]).toHaveLength(0);
  expect([...library.allBooks(2)].map((book) => book.text)).toEqual([
    "aa",
    "bb",
    "ba",
    "ab",
  ]);
  expect(
    [...library.booksFrom(0n, { limit: 3 })].map((book) => book.text),
  ).toEqual(["aa", "bb", "ba"]);
});

test("置换后：0 号书保持最短空格书，连号书互不相同", () => {
  const library = createLibrary(["a", "b", "c"], {
    minLength: 3,
    maxLength: 4,
  });
  const books = [...library.booksFrom(0n, { limit: 12 })];
  const texts = books.map((book) => book.text);

  expect(books.map((book) => book.bookNumber)).toEqual(
    Array.from({ length: 12 }, (_, i) => BigInt(i)),
  );
  expect(texts[0]).toBe("aaa");
  expect(texts.every((text) => Array.from(text).length === 3)).toBe(true);
  expect(new Set(texts).size).toBe(texts.length);
  expect(
    new Set(texts.map((text) => Array.from(text)[0])).size,
  ).toBeGreaterThan(1);

  for (const book of books) {
    expect(library.bookNumberToText(book.bookNumber)).toBe(book.text);
    expect(library.textToBookNumber(book.text)).toBe(book.bookNumber);
  }
});

test("最小长度下的包含计数与枚举", () => {
  const library = createLibrary(["a", "b"], { minLength: 2, maxLength: 4 });

  expect(library.countBooksContaining("a", 4)).toBe(3n + 7n + 15n);
  expect(library.countBooksContaining("a", 1)).toBe(0n);
  expect(library.countBooksContaining("", 4)).toBe(library.totalBooks(4));
  expect(library.countsByLength("a", 4).slice(0, 2)).toEqual([0n, 0n]);

  const books = [...library.booksContaining("a", { maxLength: 3 })];

  expect(books.every((book) => Array.from(book.text).length >= 2)).toBe(true);
  expect(BigInt(books.length)).toBe(3n + 7n);
});

test("最小长度参与指纹与参数校验", () => {
  expect(charsetFingerprint(["a", "b"], 10, 2)).not.toBe(
    charsetFingerprint(["a", "b"], 10, 0),
  );

  const library = createLibrary(["a", "b"], { minLength: 2, maxLength: 4 });

  expect(library.fingerprint).toBe(
    charsetFingerprint(["a", "b"], 4, 2, PERMUTE_VERSION),
  );
  expect(() => createLibrary(["a"], { minLength: 2, maxLength: 1 })).toThrow(
    /不能超过最大长度/,
  );
  expect(() => createLibrary(["a"], { minLength: -1 })).toThrow(/非负整数/);
});

test("图书位置：房间/墙/书架/卷", () => {
  const library = createLibrary(["a"]);

  expect(library.bookLocation(0n)).toEqual({
    hexagon: 0n,
    wall: 0,
    shelf: 0,
    shelfOnWall: 0,
    volume: 0,
  });
  expect(library.bookLocation(32n)).toMatchObject({ shelf: 1, volume: 0 });
  expect(library.bookLocation(672n)).toMatchObject({
    shelf: 1,
    volume: 0,
  });
  expect(library.bookLocation(BigInt(BOOKS_PER_HEXAGON))).toMatchObject({
    hexagon: 1n,
    shelf: 0,
    volume: 0,
  });
  expect(library.bookLocation(160n)).toMatchObject({
    wall: 1,
    shelf: 5,
    shelfOnWall: 0,
  });
});

test("书架号与图书编号互转", () => {
  const library = createLibrary(["a", "b"], { maxLength: 10 });

  for (let number = 0n; number < 20n; number++) {
    expect(library.bookNumberFromLocation(library.bookLocation(number))).toBe(
      number,
    );
  }

  for (const location of [
    { hexagon: 0n, wall: 0, shelfOnWall: 0, volume: 0 },
    { hexagon: 0n, wall: 3, shelfOnWall: 4, volume: 31 },
    { hexagon: 2n, wall: 1, shelfOnWall: 2, volume: 17 },
    { hexagon: 5n, wall: 0, shelfOnWall: 4, volume: 31 },
  ]) {
    const number = library.bookNumberFromLocation(location);

    expect(library.bookLocation(number)).toMatchObject(location);
  }

  expect(
    library.bookNumberFromLocation({
      hexagon: "10",
      wall: 0,
      shelfOnWall: 0,
      volume: 0,
    }),
  ).toBe(BigInt(62 * BOOKS_PER_HEXAGON));

  expect(() =>
    library.bookNumberFromLocation({
      hexagon: 0n,
      wall: 4,
      shelfOnWall: 0,
      volume: 0,
    }),
  ).toThrow(/墙必须在/);
  expect(() =>
    library.bookNumberFromLocation({
      hexagon: 0n,
      wall: 0,
      shelfOnWall: 5,
      volume: 0,
    }),
  ).toThrow(/层必须在/);
  expect(() =>
    library.bookNumberFromLocation({
      hexagon: 0n,
      wall: 0,
      shelfOnWall: 0,
      volume: 32,
    }),
  ).toThrow(/卷必须在/);
});

test("booksFrom 从任意编号开始按升序枚举", () => {
  const library = createLibrary(["a", "b"], { maxLength: 4 });
  const all = [...library.allBooks(4)];
  const from = [...library.booksFrom(3n, { limit: 7 })];

  expect(from.map((book) => book.bookNumber)).toEqual(
    all.slice(3, 10).map((book) => book.bookNumber),
  );
  expect(from.map((book) => book.text)).toEqual(
    all.slice(3, 10).map((book) => book.text),
  );
});

test("booksFrom 支持 offset 与 limit", () => {
  const library = createLibrary(["a", "b"], { maxLength: 4 });
  const all = [...library.allBooks(4)];
  const from = [...library.booksFrom(0n, { offset: 5, limit: 3 })];

  expect(from.map((book) => book.bookNumber)).toEqual(
    all.slice(5, 8).map((book) => book.bookNumber),
  );
});

test("booksFrom 处理空书与图书馆尽头", () => {
  const library = createLibrary(["a", "b"], { maxLength: 3 });

  expect(
    [...library.booksFrom(0n, { limit: 3 })].map((book) => book.text),
  ).toEqual(["", "a", "b"]);

  const last = library.totalBooks(3) - 1n;
  expect([...library.booksFrom(last, { limit: 5 })]).toHaveLength(1);
  expect(() => library.booksFrom(last + 1n)).toThrow(/超出图书馆范围/);
});

test("文本位置：页码/行号/列号", () => {
  const library = createLibrary(["a"]);

  expect(library.textLocation(0)).toEqual({ page: 0, line: 0, column: 0 });
  expect(library.textLocation(79)).toEqual({ page: 0, line: 0, column: 79 });
  expect(library.textLocation(80)).toEqual({ page: 0, line: 1, column: 0 });
  expect(library.textLocation(3200)).toEqual({ page: 1, line: 0, column: 0 });
});

test("包含计数与穷举一致（含重叠模式）", () => {
  const charset = ["a", "b", "c"];
  const library = createLibrary(charset, { maxLength: 10 });
  const texts = allTextsUpTo(charset, 4);

  for (const pattern of ["ab", "aa", "b", "abc"]) {
    const brute = texts.filter((text) => text.includes(pattern)).length;
    const counted = library.countBooksContaining(pattern, 4);
    const summed = library
      .countsByLength(pattern, 4)
      .reduce((sum, count) => sum + count, 0n);

    expect(counted).toBe(BigInt(brute));
    expect(summed).toBe(BigInt(brute));
  }
});

test("单字符模式使用闭式公式且结果正确", () => {
  const library = createLibrary(["a", "b", "c"], { maxLength: 10 });
  const window = 5;
  const expected = Array.from({ length: window }, (_, i) => {
    const length = i + 1;
    return 3n ** BigInt(length) - 2n ** BigInt(length);
  }).reduce((sum, count) => sum + count, 0n);

  expect(library.countBooksContaining("a", window)).toBe(expected);
});

test("booksContaining 惰性枚举恰好覆盖全部包含书且不重复", () => {
  const charset = ["a", "b"];
  const library = createLibrary(charset, { maxLength: 10 });
  const window = 3;
  const texts = allTextsUpTo(charset, window);

  for (const pattern of ["a", "aa"]) {
    const expected = texts.filter((text) => text.includes(pattern));
    const books = [...library.booksContaining(pattern, { maxLength: window })];

    expect(books.map((book) => book.text).sort()).toEqual(
      expected.slice().sort(),
    );
    expect(new Set(books.map((book) => book.bookNumber)).size).toBe(
      books.length,
    );
    expect(BigInt(books.length)).toBe(
      library.countBooksContaining(pattern, window),
    );
  }
});

test("booksContaining 支持 limit 与 offset", () => {
  const library = createLibrary(["a", "b"], { maxLength: 10 });
  const all = [...library.booksContaining("a", { maxLength: 4 })];
  const windowed = [
    ...library.booksContaining("a", { maxLength: 4, offset: 2, limit: 3 }),
  ];

  expect(windowed.map((book) => book.bookNumber)).toEqual(
    all.slice(2, 5).map((book) => book.bookNumber),
  );
});

test("booksContaining 第一本为最短纯子串书", () => {
  const library = createLibrary([" ", "a", "b"], {
    minLength: 2,
    maxLength: 4,
  });

  expect(
    [...library.booksContaining("a", { maxLength: 2, limit: 1 })][0]?.text,
  ).toBe("a ");
  expect(
    [...library.booksContaining("ab", { maxLength: 2, limit: 1 })][0]?.text,
  ).toBe("ab");
});

test("booksContaining 同长度伪随机、确定且完整不重复", () => {
  const library = createLibrary(["a", "b", "c"], { maxLength: 10 });
  const first = [...library.booksContaining("ab", { maxLength: 3, limit: 4 })];
  const second = [...library.booksContaining("ab", { maxLength: 3, limit: 4 })];

  expect(first).toEqual(second);
  expect(first[0]?.text).toBe("ab");
  expect(first.every((book) => book.text.includes("ab"))).toBe(true);

  const all = [...library.booksContaining("ab", { maxLength: 3 })];

  expect(all).toHaveLength(7);
  expect(new Set(all.map((book) => book.bookNumber.toString())).size).toBe(
    all.length,
  );
});

test("空模式等价于枚举窗口内全部书", () => {
  const library = createLibrary(["a", "b"], { maxLength: 10 });

  expect(library.countBooksContaining("", 3)).toBe(library.totalBooks(3));
  expect([...library.booksContaining("", { maxLength: 3 })]).toEqual([
    ...library.allBooks(3),
  ]);
});

test("越界输入被拒绝", () => {
  const library = createLibrary(["a", "b"], { maxLength: 3 });

  expect(() => library.textToBookNumber("中")).toThrow(/不在图书馆字符集/);
  expect(() => library.textToBookNumber("aaaa")).toThrow(/超过图书馆最大长度/);
  expect(() => library.bookNumberToText(-1n)).toThrow(/不能为负数/);
  expect(() => library.bookNumberToText("1a")).toThrow(/非负整数/);
  expect(() => library.bookNumberToText(library.totalBooks(3))).toThrow(
    /超出图书馆范围/,
  );
  expect(() => library.booksContaining("z", { maxLength: 3 })).toThrow(
    /不在图书馆字符集/,
  );
});

test("按长度统计与 DP 工作量上限", () => {
  const library = createLibrary(["a", "b", "c"], { maxLength: 10 });

  expect(() => library.countsByLength("ab", 5_001)).toThrow(
    /仅支持不超过 5000/,
  );
  expect(() => library.countsByLength("ab", 10)).not.toThrow();
});

test("真实文章：字符集、编号与位置", async () => {
  const texts = await blogTexts();

  expect(texts.length).toBeGreaterThanOrEqual(4);

  const charset = await blogCharset();
  expect(charset.length).toBeGreaterThan(BASE_CHARSET.length);
  expect(charset).toContain("中");

  const library = await blogLibrary();
  const shortest = texts.reduce((a, b) => (a.length <= b.length ? a : b));

  expect(library.minLength).toBe(Array.from(shortest).length);
  expect(() => library.textToBookNumber("")).toThrow(/小于图书馆最小长度/);

  const summary = articleBabelSummary(library, shortest);

  expect(summary.length).toBe(Array.from(shortest).length);
  expect(summary.length).toBeLessThanOrEqual(MAX_BOOK_LENGTH);
  expect(summary.bookNumber).toMatch(/^\d+$/);
  expect(library.bookNumberToText(BigInt(summary.bookNumber))).toBe(shortest);
  expect(typeof summary.location.hexagon).toBe("bigint");
});
