/** base62 字母表 */
export const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const BASE62_RADIX = BigInt(BASE62_ALPHABET.length);

/** 非负整数 -> base62 短编号（0 编码为 "0"）。 */
export const toBase62 = (value: bigint): string => {
  if (value < 0n) throw new RangeError("base62 只支持非负整数");
  if (value === 0n) return BASE62_ALPHABET[0]!;

  let code = "";

  while (value > 0n) {
    code = BASE62_ALPHABET[Number(value % BASE62_RADIX)]! + code;
    value /= BASE62_RADIX;
  }

  return code;
};

/** base62 短编号 -> 非负整数。 */
export const fromBase62 = (code: string): bigint => {
  if (code.length === 0) throw new RangeError("短编号不能为空");

  let value = 0n;

  for (const char of Array.from(code)) {
    const digit = BASE62_ALPHABET.indexOf(char);

    if (digit === -1) {
      throw new RangeError(
        `短编号包含非法字符：${JSON.stringify(char)}（base62 仅允许 0-9A-Za-z）`,
      );
    }

    value = value * BASE62_RADIX + BigInt(digit);
  }

  return value;
};

export const randomBase62 = (length: number): string => {
  let code = "";

  for (let i = 0; i < length; i++) {
    code += BASE62_ALPHABET[Math.floor(Math.random() * BASE62_ALPHABET.length)];
  }

  return code;
};
