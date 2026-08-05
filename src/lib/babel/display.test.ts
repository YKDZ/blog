import { expect, test } from "vitest";

import { bookNumberCodeFromLocation, formatBookLocation } from "./display";

test("书架号默认完整显示", () => {
  expect(
    formatBookLocation({
      hexagon: "1234567890123",
      wall: 1,
      shelfOnWall: 2,
      volume: 3,
    }),
  ).toBe("1234567890123-w2-s3-v4");
});

test("书架号可只显示房间前 4 位与后 4 位", () => {
  const long = "123456789012345678901234567890";

  expect(
    formatBookLocation(
      { hexagon: long, wall: 0, shelfOnWall: 0, volume: 0 },
      { truncateHexagon: true },
    ),
  ).toBe("1234...7890-w1-s1-v1");
});

test("房间较短时不截断", () => {
  expect(
    formatBookLocation(
      { hexagon: "12345678", wall: 0, shelfOnWall: 0, volume: 0 },
      { truncateHexagon: true },
    ),
  ).toBe("12345678-w1-s1-v1");
});

test("base62 房间号同样按前后省略显示", () => {
  const long = "0aBcDeFgHiJkLmNoPqRsTuVwXyZ123456";

  expect(
    formatBookLocation(
      { hexagon: long, wall: 0, shelfOnWall: 0, volume: 0 },
      { truncateHexagon: true },
    ),
  ).toBe("0aBc...3456-w1-s1-v1");
});

test("书架号可换算为 base62 图书编号", () => {
  expect(
    bookNumberCodeFromLocation({
      hexagon: "10",
      wall: 1,
      shelfOnWall: 2,
      volume: 3,
    }),
  ).toBe("ANf");
});
