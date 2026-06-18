import { expect, test } from "vitest";

import type { BlogFile } from "../pages/blog/@slug/lib";
import {
  absolutizeHtmlUrls,
  atomContentHtml,
  atomFeedDocuments,
  blogPreviewDocuments,
  validateAtomXml,
} from "./siteMetadata";

test("补正 Atom 正文中的站内资源链接", () => {
  expect(
    absolutizeHtmlUrls(
      [
        '<a href="/blog/first-of-all/">站内文章</a>',
        '<a href="#小节">章节</a>',
        '<a href="https://example.com/path">站外</a>',
        '<img src="/favicon.svg">',
        '<img srcset="/a.webp 480w, /b.webp 640w">',
      ].join(""),
      "https://ykdz.me/blog/current/",
    ),
  ).toBe(
    [
      '<a href="https://ykdz.me/blog/first-of-all/">站内文章</a>',
      '<a href="#小节">章节</a>',
      '<a href="https://example.com/path">站外</a>',
      '<img src="https://ykdz.me/favicon.svg">',
      '<img srcset="https://ykdz.me/a.webp 480w, https://ykdz.me/b.webp 640w">',
    ].join(""),
  );
});

test("校验符合本站输出约束的 Atom feed", () => {
  expect(() =>
    validateAtomXml(`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:base="https://ykdz.me/" xml:lang="zh-CN">
  <id>https://ykdz.me/</id>
  <title>ykdz.me</title>
  <link href="https://ykdz.me/atom.xml" rel="self" type="application/atom+xml" />
  <updated>2026-06-17T00:00:00.000Z</updated>
  <author>
    <name>YKDZ</name>
  </author>
  <entry>
    <id>https://ykdz.me/blog/demo/</id>
    <title>Demo</title>
    <published>2026-06-17T00:00:00.000Z</published>
    <updated>2026-06-17T00:00:00.000Z</updated>
    <content type="html">&lt;p&gt;正文&lt;/p&gt;</content>
  </entry>
</feed>
`),
  ).not.toThrow();
});

test("生成适合 feed reader 的 Atom 正文 HTML", () => {
  expect(
    atomContentHtml(
      [
        '<h2 id="背景" class="heading">背景<a aria-label="复制此章节链接" class="heading-anchor" data-heading-anchor="" href="#背景">#</a></h2>',
        '<h2 class="sr-only" id="footnotes" aria-hidden="true" hidden>Footnotes</h2>',
        '<pre class="shiki" style="color:red" tabindex="0"><code><span class="line" style="color:blue">pnpm build</span></code></pre>',
        '<a href="/blog/first-of-all/" target="_blank" rel="noopener noreferrer" data-demo="x">文章</a>',
        '<img class="picture" src="/favicon.svg" alt="favicon" width="128" height="128" loading="lazy">',
      ].join(""),
      "https://ykdz.me/blog/current/",
    ),
  ).toBe(
    [
      '<h2 id="背景">背景</h2>',
      "<pre><code><span>pnpm build</span></code></pre>",
      '<a href="https://ykdz.me/blog/first-of-all/">文章</a>',
      '<img src="https://ykdz.me/favicon.svg" alt="favicon" width="128" height="128">',
    ].join(""),
  );
});

test("拒绝非 RFC3339 日期的 Atom feed", () => {
  expect(() =>
    validateAtomXml(`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:base="https://ykdz.me/" xml:lang="zh-CN">
  <id>https://ykdz.me/</id>
  <title>ykdz.me</title>
  <link href="https://ykdz.me/atom.xml" rel="self" type="application/atom+xml" />
  <updated>Wed, 17 Jun 2026 00:00:00 GMT</updated>
</feed>
`),
  ).toThrow("updated is not RFC3339");
});

test("Atom feed 只在订阅入口保留最新文章并生成归档", async () => {
  const demoBlogs = Array.from({ length: 18 }, (_, index) => {
    const order = 18 - index;

    return {
      filePath: `/workspaces/blog/public/blogs/${order}-demo/index.md`,
      publicPath: `/blogs/${order}-demo/index.md`,
      time: Date.UTC(2026, 5, order),
      slug: `demo-${order}`,
      title: `Demo ${order}`,
      content: `# Demo ${order}\n\n正文 ${order}`,
      latestModifiedAt: new Date(Date.UTC(2026, 5, order)).toISOString(),
    } satisfies BlogFile;
  });
  const documents = await atomFeedDocuments(demoBlogs);
  const [current, archive] = documents;

  expect(documents).toHaveLength(2);
  expect(current?.path).toBe("/atom.xml");
  expect(current?.xml.match(/<entry>/g)).toHaveLength(16);
  expect(current?.xml).toContain('rel="prev-archive"');
  expect(archive?.path).toBe("/atom/archive/1.xml");
  expect(archive?.xml.match(/<entry>/g)).toHaveLength(2);
  expect(archive?.xml).toContain(
    'xmlns:fh="http://purl.org/syndication/history/1.0"',
  );
  expect(archive?.xml).toContain("<fh:archive/>");
  expect(archive?.xml).toContain('rel="current"');
  expect(archive?.xml).toContain(
    'rel="alternate" type="text/markdown" hreflang="zh-CN"',
  );
  expect(() => validateAtomXml(current?.xml ?? "")).not.toThrow();
  expect(() => validateAtomXml(archive?.xml ?? "")).not.toThrow();
});

test("生成按需加载的博客预览 JSON", async () => {
  const previews = await blogPreviewDocuments([
    {
      filePath: "/workspaces/blog/public/blogs/1-demo/index.md",
      publicPath: "/blogs/1-demo/index.md",
      time: Date.UTC(2026, 5, 1),
      slug: "demo",
      title: "Demo",
      content: "# Demo\n\n开头\n\n## 章节\n\n目标正文\n\n后续正文",
    } satisfies BlogFile,
  ]);
  const indexPreview = previews.find(
    (preview) => preview.path === "/blog-previews/demo/index.json",
  );
  const headingPreview = previews.find(
    (preview) =>
      preview.path === `/blog-previews/demo/${encodeURIComponent("章节")}.json`,
  );
  const indexJson = JSON.parse(indexPreview?.json ?? "") as {
    html: string;
  };
  const headingJson = JSON.parse(headingPreview?.json ?? "") as {
    html: string;
  };

  expect(previews).toHaveLength(2);
  expect(indexJson).toEqual(
    expect.objectContaining({
      slug: "demo",
      title: "Demo",
    }),
  );
  expect(indexJson.html).toContain("<p>开头</p>");
  expect(headingJson.html).toContain("<p>开头</p>");
  expect(headingJson.html).toContain('<h2 id="章节">');
  expect(headingJson.html).toContain("<p>目标正文</p>");
});
