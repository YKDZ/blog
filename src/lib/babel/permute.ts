/**
 * 同长度图书编号的可逆伪随机置换。
 *
 * libraryofbabel.info 用可逆 PRNG（LCG + 位混合）打乱“编号 → 文本”的
 * 关系，让连号的书看起来互不相关。这里对每个长度内部做若干轮 Feistel
 * 置换：编号在该长度内仍是双射，因此每本书仍然唯一、可精确互转，但
 * 相邻编号的书会得到完全不同的文本。
 */

/** 置换轮数。 */
export const PERMUTE_ROUNDS = 10;
/** 指纹版本：编号规则（含置换参数）变更时递增。 */
export const PERMUTE_VERSION = "babel-v2";

const MASK64 = (1n << 64n) - 1n;
const GOLDEN = 0x9e3779b97f4a7c15n;

const splitmix64 = (x: bigint): bigint => {
  x = (x ^ (x >> 30n)) & MASK64;
  x = (x * 0xbf58476d1ce4e5b9n) & MASK64;
  x = (x ^ (x >> 27n)) & MASK64;
  x = (x * 0x94d049bb133111ebn) & MASK64;

  return (x ^ (x >> 31n)) & MASK64;
};

const digitsToRank = (digits: readonly number[], radix: bigint): bigint => {
  let rank = 0n;

  for (const digit of digits) {
    rank = rank * radix + BigInt(digit);
  }

  return rank;
};

const rankToDigits = (
  rank: bigint,
  length: number,
  radix: bigint,
): number[] => {
  const digits = new Array<number>(length);

  for (let i = length - 1; i >= 0; i--) {
    digits[i] = Number(rank % radix);
    rank /= radix;
  }

  return digits;
};

const addDigitsMod = (
  left: readonly number[],
  right: readonly number[],
  radix: number,
): number[] => {
  const out = new Array<number>(left.length);
  let carry = 0;

  for (let i = left.length - 1; i >= 0; i--) {
    const sum = left[i]! + right[i]! + carry;
    out[i] = sum % radix;
    carry = Math.floor(sum / radix);
  }

  return out;
};

const subDigitsMod = (
  left: readonly number[],
  right: readonly number[],
  radix: number,
): number[] => {
  const out = new Array<number>(left.length);
  let borrow = 0;

  for (let i = left.length - 1; i >= 0; i--) {
    let diff = left[i]! - right[i]! - borrow;

    if (diff < 0) {
      diff += radix;
      borrow = 1;
    } else {
      borrow = 0;
    }

    out[i] = diff;
  }

  return out;
};

/**
 * Feistel 轮函数：把右半边的数字序列与轮次、长度混合成一个伪随机数，
 * 输出为固定长度的数字序列。仅用于视觉随机性，不需要密码学强度。
 */
const roundDigits = (
  right: readonly number[],
  outLength: number,
  round: number,
  length: number,
  radix: bigint,
): number[] => {
  let state =
    0x6a09e667bb67ae85n ^
    (BigInt(round) * GOLDEN) ^
    (BigInt(length) * 0xbf58476d1ce4e5b9n);
  state = splitmix64(state);

  for (const digit of right) {
    state = splitmix64(state ^ BigInt(digit));
  }

  const out = new Array<number>(outLength);

  for (let i = 0; i < outLength; i++) {
    state = splitmix64(state + GOLDEN);
    out[i] = Number(state % radix);
  }

  return out;
};

export const permuteDigits = (
  digits: readonly number[],
  radixNumber: number,
  rounds = PERMUTE_ROUNDS,
): number[] => {
  const length = digits.length;

  if (length <= 1) return [...digits];

  const radix = BigInt(radixNumber);
  const leftLength = Math.floor(length / 2);
  const rightLength = length - leftLength;

  let a = leftLength;
  let b = rightLength;
  let left = digits.slice(0, a);
  let right = digits.slice(a);

  for (let round = 0; round < rounds; round++) {
    const pad = roundDigits(right, a, round, length, radix);
    const sum = addDigitsMod(left, pad, radixNumber);

    left = right;
    right = sum;
    [a, b] = [b, a];
  }

  return [...left, ...right];
};

export const unpermuteDigits = (
  digits: readonly number[],
  radixNumber: number,
  rounds = PERMUTE_ROUNDS,
): number[] => {
  const length = digits.length;

  if (length <= 1) return [...digits];

  const radix = BigInt(radixNumber);
  const leftLength = Math.floor(length / 2);
  const rightLength = length - leftLength;

  let a = leftLength;
  let b = rightLength;
  let left = digits.slice(0, a);
  let right = digits.slice(a);

  for (let round = rounds - 1; round >= 0; round--) {
    // 当前状态是第 round 轮之后的结果：a = a_{round+1} = b_round，
    // b = b_{round+1} = a_round。反推这一轮：
    //   R_round = L_{round+1}，L_round = (R_{round+1} - F_round(R_round)) mod R^a_round
    const pad = roundDigits(left, b, round, length, radix);
    const diff = subDigitsMod(right, pad, radixNumber);

    const newLeft = diff;
    const newRight = left;

    left = newLeft;
    right = newRight;
    [a, b] = [b, a];
  }

  return [...left, ...right];
};

/** 长度内部排名 → 置换后的排名（长度 0/1 或 radix 1 时恒等）。 */
export const permuteRank = (
  rank: bigint,
  length: number,
  radix: number,
): bigint => {
  if (length <= 1 || radix <= 1) return rank;

  const radixBig = BigInt(radix);

  return digitsToRank(
    permuteDigits(rankToDigits(rank, length, radixBig), radix),
    radixBig,
  );
};

/** 置换后的排名 → 原始排名（长度 0/1 或 radix 1 时恒等）。 */
export const unpermuteRank = (
  value: bigint,
  length: number,
  radix: number,
): bigint => {
  if (length <= 1 || radix <= 1) return value;

  const radixBig = BigInt(radix);

  return digitsToRank(
    unpermuteDigits(rankToDigits(value, length, radixBig), radix),
    radixBig,
  );
};

/**
 * 在 [0, count) 上做可逆伪随机置换。
 *
 * 先用 seed 异或打散，再对 2 的幂域做 Feistel 置换；结果越界时循环重试
 * （cycle walking），因此仍是 [0, count) 上的双射。用于按需枚举包含某
 * 子串的书，让同长度内相邻的结果看起来互不相关。
 */
export const permuteRange = (
  value: bigint,
  count: bigint,
  seed = 0n,
): bigint => {
  if (count <= 0n) throw new RangeError("count 必须是正整数");
  if (value < 0n || value >= count) {
    throw new RangeError(`value 必须在 [0, ${count}) 内`);
  }

  if (count <= 1n) return 0n;

  const bits = (count - 1n).toString(2).length;
  const domain = 1n << BigInt(bits);
  const mask = domain - 1n;
  let x = value;

  do {
    const mixed = x ^ (seed & mask);
    const digits = rankToDigits(mixed, bits, 2n);
    const permuted = permuteDigits(digits, 2);
    x = digitsToRank(permuted, 2n);
  } while (x >= count);

  return x;
};
