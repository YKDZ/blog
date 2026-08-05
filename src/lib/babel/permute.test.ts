import { expect, test } from "vitest";

import { permuteRange, permuteRank, unpermuteRank } from "./permute";

const power = (radix: number, length: number): bigint =>
  BigInt(radix) ** BigInt(length);

test("permute/unpermute 在所有小长度、小字符集上互逆", () => {
  for (const radix of [2, 3, 5]) {
    for (let length = 0; length <= 7; length++) {
      const total = power(radix, length);

      for (let rank = 0n; rank < total; rank++) {
        const permuted = permuteRank(rank, length, radix);

        expect(permuted).toBeGreaterThanOrEqual(0n);
        expect(permuted).toBeLessThan(total);
        expect(unpermuteRank(permuted, length, radix)).toBe(rank);
      }
    }
  }
});

test("permute 是双射且长度 0/1 恒等", () => {
  const radix = 3;
  const length = 5;
  const total = power(radix, length);
  const seen = new Set<bigint>();

  for (let rank = 0n; rank < total; rank++) {
    const permuted = permuteRank(rank, length, radix);

    expect(seen.has(permuted)).toBe(false);
    seen.add(permuted);
  }

  expect(seen.size).toBe(Number(total));
  expect(permuteRank(0n, 0, radix)).toBe(0n);
  expect(permuteRank(2n, 1, radix)).toBe(2n);
  expect(unpermuteRank(1n, 0, radix)).toBe(1n);
});

test("置换会把相邻排名打散（非字典序保持）", () => {
  const radix = 3;
  const length = 4;
  const neighbors = [0n, 1n, 2n, 3n, 4n].map((rank) =>
    permuteRank(rank, length, radix),
  );

  expect(new Set(neighbors).size).toBe(neighbors.length);
  expect(neighbors).not.toEqual([0n, 1n, 2n, 3n, 4n]);
});

test("permuteRange 在任意小 count 上是双射且确定", () => {
  for (const count of [1n, 2n, 3n, 7n, 8n, 17n, 63n]) {
    for (const seed of [0n, 1n, 123n]) {
      const seen = new Set<bigint>();

      for (let value = 0n; value < count; value++) {
        const permuted = permuteRange(value, count, seed);

        expect(permuted).toBeGreaterThanOrEqual(0n);
        expect(permuted).toBeLessThan(count);
        expect(seen.has(permuted)).toBe(false);
        seen.add(permuted);
      }

      expect(seen.size).toBe(Number(count));
    }
  }
});
