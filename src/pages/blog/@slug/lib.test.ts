import { expect, test } from "vitest";

import {
  blogUrl,
  contentHtml,
  firstMarkdownHeading,
  normalizeMarkdownResourceUrls,
  publicUrlFromPath,
  slugFromDirName,
  stripFirstMarkdownHeading,
  type BlogFile,
} from "./lib";
import { headingIdFromText } from "./plugins/headingId";

test("从带时间戳目录名中提取 slug", () => {
  expect(slugFromDirName("1781577996590-second-blog")).toBe("second-blog");
});

test("生成带章节 hash 的博客 URL", () => {
  expect(blogUrl("second-blog", "#小节")).toBe("/blog/second-blog#小节");
});

test("把 public 内绝对文件路径转换成前端 URL", () => {
  expect(
    publicUrlFromPath("/workspaces/blog/public/blogs/demo/assets/测试 图.png"),
  ).toBe("/blogs/demo/assets/%E6%B5%8B%E8%AF%95%20%E5%9B%BE.png");
});

test("从标题文本生成章节 id", () => {
  expect(headingIdFromText(" 小节 标题 ")).toBe("小节-标题");
});

test("规范化 Markdown 裸写资源路径中的空白", () => {
  expect(
    normalizeMarkdownResourceUrls(
      "![图片](public/blogs/a/assets/demo image.png)",
    ),
  ).toBe("![图片](public/blogs/a/assets/demo%20image.png)");
});

test("规范化 Markdown 资源路径时保留 title 文本", () => {
  expect(
    normalizeMarkdownResourceUrls(
      '![图片](public/blogs/a/assets/demo image.png "说明文本")',
    ),
  ).toBe('![图片](public/blogs/a/assets/demo%20image.png "说明文本")');
});

test("提取并剥离第一条 Markdown 标题", () => {
  const content = "# 页面标题\n\n## 正文标题\n\n内容";

  expect(firstMarkdownHeading(content)).toBe("页面标题");
  expect(stripFirstMarkdownHeading(content)).toBe("## 正文标题\n\n内容");
});

test("带空格文件名的图片渲染为 img 标签", async () => {
  const blog = {
    filePath: "/workspaces/blog/public/blogs/1781573541062-test/index.md",
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content: "![图片](public/blogs/1781573541062-test/assets/demo image.png)",
  } satisfies BlogFile;

  expect(String(await contentHtml(blog))).toContain(
    '<img src="/blogs/1781573541062-test/assets/demo%20image.png" alt="图片">',
  );
});

test("带 title 的图片渲染为 img 标签并保留 title", async () => {
  const blog = {
    filePath: "/workspaces/blog/public/blogs/1781573541062-test/index.md",
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content:
      '![图片](public/blogs/1781573541062-test/assets/demo image.png "说明文本")',
  } satisfies BlogFile;

  expect(String(await contentHtml(blog))).toContain(
    '<img src="/blogs/1781573541062-test/assets/demo%20image.png" alt="图片" title="说明文本">',
  );
});

test("正文渲染不重复输出第一条标题", async () => {
  const blog = {
    filePath: "/workspaces/blog/public/blogs/1781573541062-test/index.md",
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "页面标题",
    content: "# 页面标题\n\n## 正文标题\n\n内容",
  } satisfies BlogFile;

  const html = String(await contentHtml(blog));

  expect(html).not.toContain("页面标题");
  expect(html).toContain('<h2 id="正文标题">正文标题</h2>');
});

test("代码块使用 GitHub 深色主题高亮", async () => {
  const blog = {
    filePath: "/workspaces/blog/public/blogs/1781573541062-test/index.md",
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content: "```ts\nconst answer = 42\n```",
  } satisfies BlogFile;

  const html = String(await contentHtml(blog));

  expect(html).toContain('class="shiki github-dark-default"');
  expect(html).toContain("background-color:#0d1117");
  expect(html).toContain("<span");
  expect(html).toContain("answer");
  expect(html).not.toContain('<span class="line"><span></span></span>');
});

test("未知语言代码块退回普通文本高亮", async () => {
  const blog = {
    filePath: "/workspaces/blog/public/blogs/1781573541062-test/index.md",
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content: "```does-not-exist\nplain text\n```",
  } satisfies BlogFile;

  const html = String(await contentHtml(blog));

  expect(html).toContain('class="shiki github-dark-default"');
  expect(html).toContain("plain text");
});

test("GFM 脚注引用和返回链接可以互相跳转", async () => {
  const blog = {
    filePath: "/workspaces/blog/public/blogs/1781573541062-test/index.md",
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content: "正文[^note]\n\n[^note]: 脚注内容",
  } satisfies BlogFile;

  const html = String(await contentHtml(blog));

  expect(html).toContain('href="#user-content-fn-note"');
  expect(html).toContain('id="user-content-fn-note"');
  expect(html).toContain('href="#user-content-fnref-note"');
  expect(html).toContain('id="user-content-fnref-note"');
  expect(html).not.toContain("user-content-user-content");
});
