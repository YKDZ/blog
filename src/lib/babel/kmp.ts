/**
 * KMP 自动机：给定模式串（以字符集下标表示），构造状态转移表。
 * 状态 s 表示“当前已匹配的模式前缀长度”，到达状态 m 即发生匹配。
 */
export type KmpAutomaton = {
  size: number;
  pattern: readonly number[];
  failure: readonly number[];
  delta: Int32Array;
};

export const buildKmpAutomaton = (
  pattern: readonly number[],
  size: number,
): KmpAutomaton => {
  const m = pattern.length;
  const failure = new Array<number>(m).fill(0);

  for (let i = 1; i < m; i++) {
    let j = failure[i - 1]!;

    while (j > 0 && pattern[i] !== pattern[j]) {
      j = failure[j - 1]!;
    }

    if (pattern[i] === pattern[j]) j++;

    failure[i] = j;
  }

  const delta = new Int32Array((m + 1) * size);

  for (let state = 0; state <= m; state++) {
    for (let char = 0; char < size; char++) {
      if (state < m && pattern[state] === char) {
        delta[state * size + char] = state + 1;
      } else if (state === 0) {
        delta[state * size + char] = 0;
      } else {
        delta[state * size + char] = delta[failure[state - 1]! * size + char]!;
      }
    }
  }

  return { size, pattern, failure, delta } satisfies KmpAutomaton;
};
