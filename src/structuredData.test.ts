import { expect, test } from "vitest";

import type { BlogMetadata } from "./pages/blog/@slug/types";
import {
  blogPostingStructuredData,
  homeStructuredData,
  jsonLd,
} from "./structuredData";

const blog = {
  time: Date.UTC(2026, 5, 17),
  slug: "demo-post",
  title: "Demo Post",
  description: "Demo description",
  markdownPath: "/blogs/1781667000000-demo-post/index.md",
  latestModifiedAt: "2026-06-17T03:30:00.000Z",
} satisfies BlogMetadata;

test("首页结构化数据描述站点和博客索引", () => {
  const data = homeStructuredData([blog]);

  expect(data["@context"]).toBe("https://schema.org");
  expect(data["@graph"]).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        "@type": "Person",
        "@id": "https://ykdz.me/#author",
      }),
      expect.objectContaining({
        "@type": "WebSite",
        "@id": "https://ykdz.me/#website",
      }),
      expect.objectContaining({
        "@type": "Blog",
        "@id": "https://ykdz.me/#blog",
        blogPost: [
          expect.objectContaining({
            "@type": "BlogPosting",
            "@id": "https://ykdz.me/blog/demo-post/#blogposting",
            headline: "Demo Post",
            description: "Demo description",
          }),
        ],
      }),
    ]),
  );
});

test("文章结构化数据描述单篇 BlogPosting", () => {
  expect(blogPostingStructuredData(blog)).toEqual(
    expect.objectContaining({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": "https://ykdz.me/blog/demo-post/#blogposting",
      headline: "Demo Post",
      description: "Demo description",
      dateModified: "2026-06-17T03:30:00.000Z",
      inLanguage: "zh-CN",
      isPartOf: {
        "@id": "https://ykdz.me/#blog",
      },
    }),
  );
});

test("结构化数据序列化为 JSON-LD", () => {
  expect(JSON.parse(jsonLd(blogPostingStructuredData(blog)))).toEqual(
    blogPostingStructuredData(blog),
  );
});
