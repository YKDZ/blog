import { BASE_CHARSET } from "./config";
import { PERMUTE_VERSION } from "./permute";

/**
 * 由若干文本构造扩展字符集：原版字符集在前，其余字符按码点升序排列。
 * 字符顺序即图书编号的字典序。
 */
export const charsetFromTexts = (
  texts: Iterable<string>,
  base: readonly string[] = BASE_CHARSET,
): string[] => {
  const seen = new Set(base);
  const rest: string[] = [];

  for (const text of texts) {
    for (const char of Array.from(text)) {
      if (seen.has(char)) continue;

      seen.add(char);
      rest.push(char);
    }
  }

  rest.sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0));

  return [...base, ...rest];
};

/** 校验字符集：非空、无重复、每个元素都是单个 Unicode 码点。 */
export const assertValidCharset = (charset: readonly string[]): void => {
  if (charset.length === 0) {
    throw new RangeError("字符集不能为空");
  }

  const seen = new Set<string>();

  for (const char of charset) {
    if (Array.from(char).length !== 1) {
      throw new RangeError(`字符集元素必须是单个码点：${JSON.stringify(char)}`);
    }

    if (seen.has(char)) {
      throw new RangeError(`字符集包含重复字符：${JSON.stringify(char)}`);
    }

    seen.add(char);
  }
};

/** 检查文本是否完全落在字符集内，否则抛出错误并指出第一个越界字符。 */
export const assertTextInCharset = (
  text: string,
  charset: readonly string[],
): void => {
  const lookup = new Set(charset);

  for (const char of Array.from(text)) {
    if (!lookup.has(char)) {
      throw new RangeError(
        `字符 ${JSON.stringify(char)}（U+${char
          .codePointAt(0)
          ?.toString(16)
          .toUpperCase()}）不在图书馆字符集中`,
      );
    }
  }
};

/**
 * 字符集指纹：对字符序列和最大长度做 FNV-1a 64 位哈希。
 * 图书编号依赖字符集，指纹用于标识编号所对应的“图书馆版本”。
 */
export const charsetFingerprint = (
  charset: readonly string[],
  maxLength: number,
  minLength = 0,
  version = PERMUTE_VERSION,
): string => {
  let hash = 0xcbf29ce484222325n;
  const data =
    `${version}\u0000${minLength}\u0000${maxLength}\u0000` + charset.join("");

  for (const char of Array.from(data)) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }

  return hash.toString(16).padStart(16, "0");
};
