import { resolve } from "node:path";

import { expect, test } from "vitest";

import {
  blogUrl,
  contentHtml,
  firstMarkdownHeading,
  markdownDescription,
  normalizeMarkdownResourceUrls,
  PUBLIC_DIR,
  publicUrlFromPath,
  slugFromDirName,
  stripFirstMarkdownHeading,
  type BlogFile,
} from "./lib";
import { headingIdFromText } from "./plugins/headingId";

const testBlogPath = resolve(PUBLIC_DIR, "blogs/1781573541062-test/index.md");

test("从带时间戳目录名中提取 slug", () => {
  expect(slugFromDirName("1781577996590-second-blog")).toBe("second-blog");
});

test("生成带章节 hash 的博客 URL", () => {
  expect(blogUrl("second-blog", "#小节")).toBe("/blog/second-blog/#小节");
});

test("把 public 内绝对文件路径转换成前端 URL", () => {
  expect(
    publicUrlFromPath(resolve(PUBLIC_DIR, "blogs/demo/assets/测试 图.png")),
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

test("规范化 Markdown 资源路径时跳过独立 URL", () => {
  expect(
    normalizeMarkdownResourceUrls(
      "![站外](https://example.com/demo image.png)\n[章节](#demo title)",
    ),
  ).toBe("![站外](https://example.com/demo image.png)\n[章节](#demo title)");
});

test("提取并剥离第一条 Markdown 标题", () => {
  const content = "# 页面标题\n\n## 正文标题\n\n内容";

  expect(firstMarkdownHeading(content)).toBe("页面标题");
  expect(stripFirstMarkdownHeading(content)).toBe("## 正文标题\n\n内容");
});

test("从第一条标题后的第一段正文提取文章描述", () => {
  expect(
    markdownDescription(
      "# 页面标题\n\n这是第一段正文，应该作为摘要。\n\n- 不是首选",
    ),
  ).toBe("这是第一段正文，应该作为摘要。");
});

test("文章描述忽略第一条标题前的文本", () => {
  expect(
    markdownDescription(
      "标题前文本不应作为摘要。\n\n# 页面标题\n\n标题后的正文才是摘要。",
    ),
  ).toBe("标题后的正文才是摘要。");
});

test("文章描述跳过空标题并压缩空白", () => {
  expect(markdownDescription("# 页面标题\n\n多行\n正文   内容")).toBe(
    "多行 正文 内容",
  );
});

test("标题提取尊重 Markdown 转义标点", () => {
  expect(firstMarkdownHeading("# 标题 \\_ \\* \\\\")).toBe("标题 _ * \\");
  expect(firstMarkdownHeading(String.raw`# 我的博客 <\_>`)).toBe(
    "我的博客 <_>",
  );
});

test("带空格文件名的图片渲染为 img 标签", async () => {
  const blog = {
    filePath: testBlogPath,
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
    filePath: testBlogPath,
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

test("真实本地图片渲染为 WebP", async () => {
  const blog = {
    filePath: testBlogPath,
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content:
      "![编辑器](public/blogs/1781577987795-first-of-all/assets/编辑器.png)",
  } satisfies BlogFile;

  const html = String(await contentHtml(blog));

  expect(html).not.toContain("<a ");
  expect(html).toMatch(
    /src="\/optimized-images\/blogs\/1781577987795-first-of-all\/assets\/[a-f0-9]{12}\.672w\.webp"/,
  );
  expect(html).toContain(" 480w, ");
  expect(html).toContain(" 640w, ");
  expect(html).toContain(" 672w, ");
  expect(html).toContain(" 768w, ");
  expect(html).toContain('sizes="(max-width: 767px) 100vw, 672px"');
  expect(html).toContain('width="1920"');
  expect(html).toContain('height="1040"');
});

test("本地 SVG 图片渲染明确尺寸", async () => {
  const blog = {
    filePath: testBlogPath,
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content: "![favicon](public/favicon.svg)",
  } satisfies BlogFile;

  expect(String(await contentHtml(blog))).toContain(
    '<img src="/favicon.svg" alt="favicon" width="128" height="128">',
  );
});

test("列表续行图片渲染在列表项内", async () => {
  const blog = {
    filePath: testBlogPath,
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content:
      "- 条目文本\n  ![图片](public/blogs/1781573541062-test/assets/demo image.png)",
  } satisfies BlogFile;

  expect(String(await contentHtml(blog))).toContain(
    '<li>条目文本\n<img src="/blogs/1781573541062-test/assets/demo%20image.png" alt="图片"></li>',
  );
});

test("正文渲染不重复输出第一条标题", async () => {
  const blog = {
    filePath: testBlogPath,
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "页面标题",
    content: "# 页面标题\n\n## 正文标题\n\n内容",
  } satisfies BlogFile;

  const html = String(await contentHtml(blog));

  expect(html).not.toContain("页面标题");
  expect(html).toContain(
    '<h2 id="正文标题">正文标题<a aria-label="复制此章节链接" aria-hidden="true" class="heading-anchor" data-heading-anchor="" href="#正文标题" tabindex="-1"></a></h2>',
  );
});

test("脚注隐藏标题不追加复制锚点", async () => {
  const blog = {
    filePath: testBlogPath,
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content: "正文[^1]\n\n[^1]: 脚注",
  } satisfies BlogFile;

  const html = String(await contentHtml(blog));

  expect(html).toContain(
    '<h2 class="sr-only" id="footnotes" aria-hidden="true" hidden>Footnotes</h2>',
  );
  expect(html).not.toContain('href="#footnotes"');
});

test("尊重转义下划线", async () => {
  const blog = {
    filePath: testBlogPath,
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content: String.raw`复 \_ya\_ 古`,
  } satisfies BlogFile;

  const html = String(await contentHtml(blog));

  expect(html).toContain("<p>复 _ya_ 古</p>");
  expect(html).not.toContain("<em>ya</em>");
});

test("站外链接默认在新标签页打开", async () => {
  const blog = {
    filePath: testBlogPath,
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content: "[外部链接](https://example.com)",
  } satisfies BlogFile;

  expect(String(await contentHtml(blog))).toContain(
    '<a href="https://example.com" target="_blank" rel="noopener noreferrer">外部链接</a>',
  );
});

test("站内链接保持原地跳转", async () => {
  const blog = {
    filePath: testBlogPath,
    publicPath: "/blogs/1781573541062-test/index.md",
    time: 1781573541062,
    slug: "test",
    title: "test",
    content: "[内部链接](#小节)",
  } satisfies BlogFile;

  const html = String(await contentHtml(blog));

  expect(html).toContain('<a href="#%E5%B0%8F%E8%8A%82">内部链接</a>');
  expect(html).not.toContain('target="_blank"');
});

test("代码块使用 GitHub 深色主题高亮", async () => {
  const blog = {
    filePath: testBlogPath,
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
    filePath: testBlogPath,
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
    filePath: testBlogPath,
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
