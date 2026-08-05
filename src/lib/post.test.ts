import { expect, test } from "vitest";

import { bookDescription } from "./post";

test("bookDescription 优先段落描述", () => {
  expect(bookDescription("# 标题\n\n第一段描述。")).toBe("第一段描述。");
});

test("bookDescription 无段落时回退到前 50 个字符", () => {
  const text = Array.from({ length: 30 }, (_, i) => `# 标题${i}`).join("\n");
  const description = bookDescription(text);

  expect(description.length).toBe(50);
  expect(description).toBe(Array.from(text.trimStart()).slice(0, 50).join(""));
});
