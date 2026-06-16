import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { expect, test } from "vitest";

import type { BlogFile } from "../lib";
import urlTransform from "./urlTransform";

const blog = {
  filePath: "/workspaces/blog/public/blogs/1781573541062-test/index.md",
  publicPath: "/blogs/1781573541062-test/index.md",
  time: 1781573541062,
  slug: "test",
  title: "test",
  content: "# test",
} satisfies BlogFile;

test("转换带时间戳目录的博客相对路径", async () => {
  const result = await unified()
    .use(remarkParse)
    .use(urlTransform, {
      blog,
    })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process("[文章](../1781541231997-first-of-all/index.md)");
  expect(String(result)).contains('href="/blog/first-of-all"');
});

test("转换只带 slug 目录的博客相对路径，并保留章节 hash", async () => {
  const result = await unified()
    .use(remarkParse)
    .use(urlTransform, {
      blog,
    })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process("[文章](../second-blog/index.md#小节)");
  expect(String(result)).contains(
    'href="/blog/second-blog#%E5%B0%8F%E8%8A%82"',
  );
});

test("转换以 public 开头的博客相对路径", async () => {
  const result = await unified()
    .use(remarkParse)
    .use(urlTransform, {
      blog,
    })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process("[文章](public/blogs/1781577987795-first-of-all/index.md)");
  expect(String(result)).contains('href="/blog/first-of-all"');
});

test("转换带 title 的博客路径引用并保留 title", async () => {
  const result = await unified()
    .use(remarkParse)
    .use(urlTransform, {
      blog,
    })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process('[文章](../second-blog/index.md "说明文本")');

  expect(String(result)).contains('href="/blog/second-blog"');
  expect(String(result)).contains('title="说明文本"');
});

test("转换 public 内图片相对路径", async () => {
  const result = await unified()
    .use(remarkParse)
    .use(urlTransform, {
      blog,
    })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process("![图片](./assets/demo.png)");
  expect(String(result)).contains(
    'src="/blogs/1781573541062-test/assets/demo.png"',
  );
});

test("拒绝越过 public 的相对路径", async () => {
  await expect(
    unified()
      .use(remarkParse)
      .use(urlTransform, {
        blog,
      })
      .use(remarkRehype)
      .use(rehypeStringify)
      .process("![图片](../../../secret.png)"),
  ).rejects.toThrow("outside public");
});

test("带协议的原样保留", async () => {
  const result = await unified()
    .use(remarkParse)
    .use(urlTransform, {
      blog,
    })
    .use(remarkRehype)
    .use(rehypeStringify)
    .process("[文章](http://a.b.c/d/e/f)");
  expect(String(result)).contains('href="http://a.b.c/d/e/f');
});
