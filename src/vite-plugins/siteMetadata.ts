import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cwd } from "node:process";

import { XMLParser } from "fast-xml-parser";
import { SyntaxValidator } from "fast-xml-validator";
import type {
  Element,
  ElementContent,
  Root as HastRoot,
  RootContent,
} from "hast";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Plugin } from "vite";

import { blogUrl, blogs, contentHtml } from "../pages/blog/@slug/lib";
import type { BlogFile } from "../pages/blog/@slug/lib";
import {
  ATOM_RECENT_LIMIT,
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_ORIGIN,
} from "../site";

const outputDir = resolve(cwd(), "dist", "client");
const atomArchiveOutputDir = resolve(outputDir, "atom", "archive");
const feedHistoryNamespace = "http://purl.org/syndication/history/1.0";

const absoluteUrl = (pathname: string) => {
  return new URL(pathname, SITE_ORIGIN).href;
};

const rfc3339DateTime =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const xmlEscape = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
};

const markdownEscape = (value: string) => {
  return value.replaceAll("\\", "\\\\").replaceAll("[", "\\[");
};

const lastModifiedDate = (value?: string) => {
  return value ? new Date(value).toISOString().slice(0, 10) : undefined;
};

const dateTime = (value: string | number | Date) => {
  return new Date(value).toISOString();
};

const chunks = <T>(items: T[], size: number): T[][] => {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
};

const isStandaloneUrl = (value: string) => {
  return (
    value === "" ||
    value.startsWith("#") ||
    value.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(value)
  );
};

const absolutizeUrl = (value: string, baseUrl: string) => {
  if (isStandaloneUrl(value)) return value;

  return new URL(value, baseUrl).href;
};

const absolutizeSrcset = (value: string, baseUrl: string) => {
  return value
    .split(",")
    .map((candidate) => {
      const trimmed = candidate.trim();
      const firstWhitespace = trimmed.search(/\s/);

      if (firstWhitespace === -1) return absolutizeUrl(trimmed, baseUrl);

      return `${absolutizeUrl(trimmed.slice(0, firstWhitespace), baseUrl)}${trimmed.slice(firstWhitespace)}`;
    })
    .join(", ");
};

const htmlProcessor = unified().use(rehypeParse, { fragment: true });
const htmlStringifier = unified().use(rehypeStringify);

const atomContentGlobalProperties = new Set(["id", "title"]);
const atomContentTagProperties = new Map([
  ["a", new Set(["href"])],
  ["img", new Set(["alt", "height", "sizes", "src", "srcSet", "width"])],
]);

export const absolutizeHtmlUrls = (html: string, baseUrl: string) => {
  const tree = htmlProcessor.parse(html) as HastRoot;

  visit(tree, "element", (node) => {
    const { properties } = node;

    if (typeof properties["href"] === "string") {
      properties["href"] = absolutizeUrl(properties["href"], baseUrl);
    }

    if (typeof properties["src"] === "string") {
      properties["src"] = absolutizeUrl(properties["src"], baseUrl);
    }

    if (typeof properties["srcSet"] === "string") {
      properties["srcSet"] = absolutizeSrcset(properties["srcSet"], baseUrl);
    }
  });

  return htmlStringifier.stringify(tree);
};

const isHeadingAnchor = (node: Element) => {
  return node.tagName === "a" && "dataHeadingAnchor" in node.properties;
};

const isHiddenElement = (node: Element) => {
  return "hidden" in node.properties;
};

const isAllowedAtomContentProperty = (tagName: string, property: string) => {
  return (
    atomContentGlobalProperties.has(property) ||
    (atomContentTagProperties.get(tagName)?.has(property) ?? false)
  );
};

const cleanAtomContentProperties = (node: Element, baseUrl: string) => {
  const tagName = node.tagName.toLowerCase();
  const properties: Element["properties"] = {};

  for (const [property, value] of Object.entries(node.properties)) {
    if (!isAllowedAtomContentProperty(tagName, property)) continue;

    if (property === "href" && typeof value === "string") {
      properties[property] = absolutizeUrl(value, baseUrl);
      continue;
    }

    if (property === "src" && typeof value === "string") {
      properties[property] = absolutizeUrl(value, baseUrl);
      continue;
    }

    if (property === "srcSet" && typeof value === "string") {
      properties[property] = absolutizeSrcset(value, baseUrl);
      continue;
    }

    properties[property] = value;
  }

  node.tagName = tagName;
  node.properties = properties;
};

const cleanAtomContentChildren = <T extends ElementContent | RootContent>(
  children: T[],
  baseUrl: string,
): T[] => {
  const nextChildren: T[] = [];

  for (const child of children) {
    if (child.type !== "element") {
      nextChildren.push(child);
      continue;
    }

    if (isHeadingAnchor(child) || isHiddenElement(child)) continue;

    cleanAtomContentProperties(child, baseUrl);
    child.children = cleanAtomContentChildren(child.children, baseUrl);

    nextChildren.push(child);
  }

  return nextChildren;
};

export const atomContentHtml = (html: string, baseUrl: string) => {
  const tree = htmlProcessor.parse(html) as HastRoot;
  tree.children = cleanAtomContentChildren(tree.children, baseUrl);

  return htmlStringifier.stringify(tree);
};

const xmlParser = new XMLParser({
  allowBooleanAttributes: true,
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
});

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const textContent = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return undefined;

  const text = (value as { "#text"?: unknown })["#text"];

  return typeof text === "string" ? text : undefined;
};

const hasExactlyOne = (value: unknown) => {
  return value !== undefined && !Array.isArray(value);
};

export const validateAtomXml = (xml: string) => {
  const xmlValidation = SyntaxValidator.validate(xml);
  if (xmlValidation !== true) {
    throw new Error(
      `Invalid Atom XML: ${xmlValidation.err.msg} at ${xmlValidation.err.line}:${xmlValidation.err.col}`,
    );
  }

  const document = xmlParser.parse(xml) as {
    "?xml"?: {
      "@_version"?: string;
      "@_encoding"?: string;
    };
    feed?: {
      "@_xmlns"?: string;
      "@_xmlns:fh"?: string;
      "@_xml:base"?: string;
      "@_xml:lang"?: string;
      "fh:archive"?: unknown;
      id?: unknown;
      title?: unknown;
      updated?: unknown;
      link?: unknown;
      entry?: unknown;
    };
  };
  const feed = document.feed;

  if (
    document["?xml"]?.["@_version"] !== "1.0" ||
    document["?xml"]?.["@_encoding"] !== "UTF-8"
  ) {
    throw new Error(
      'Invalid Atom feed: missing <?xml version="1.0" encoding="UTF-8"?>',
    );
  }

  if (!feed) throw new Error("Invalid Atom feed: missing feed");
  if (feed["@_xmlns"] !== "http://www.w3.org/2005/Atom") {
    throw new Error("Invalid Atom feed: missing Atom namespace");
  }
  if (
    feed["fh:archive"] !== undefined &&
    feed["@_xmlns:fh"] !== feedHistoryNamespace
  ) {
    throw new Error("Invalid Atom feed: missing Feed History namespace");
  }
  if (feed["@_xml:base"] !== absoluteUrl("/")) {
    throw new Error(
      `Invalid Atom feed: missing xml:base="${absoluteUrl("/")}"`,
    );
  }
  if (feed["@_xml:lang"] !== SITE_LANGUAGE) {
    throw new Error(`Invalid Atom feed: missing xml:lang="${SITE_LANGUAGE}"`);
  }

  const selfLink = asArray(feed.link).find((link) => {
    if (!link || typeof link !== "object") return false;

    const attributes = link as {
      "@_href"?: unknown;
      "@_rel"?: unknown;
      "@_type"?: unknown;
    };

    return (
      typeof attributes["@_href"] === "string" &&
      attributes["@_rel"] === "self" &&
      attributes["@_type"] === "application/atom+xml"
    );
  });

  if (!selfLink) {
    throw new Error("Invalid Atom feed: missing self link");
  }

  for (const element of ["id", "title", "updated"]) {
    if (!hasExactlyOne(feed[element as keyof typeof feed])) {
      throw new Error(`Invalid Atom feed: missing ${element}`);
    }
  }

  const feedUpdated = textContent(feed.updated);
  if (!feedUpdated || !rfc3339DateTime.test(feedUpdated)) {
    throw new Error(`Invalid Atom feed: updated is not RFC3339`);
  }

  const entries = asArray(feed.entry);
  const ids = new Set<string>();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      throw new Error("Invalid Atom entry: expected object");
    }

    const entryObject = entry as {
      id?: unknown;
      title?: unknown;
      updated?: unknown;
      published?: unknown;
      content?: unknown;
    };

    for (const element of ["id", "title", "updated", "content"]) {
      if (!hasExactlyOne(entryObject[element as keyof typeof entryObject])) {
        throw new Error(`Invalid Atom entry: expected one ${element}`);
      }
    }

    const id = textContent(entryObject.id);
    const updated = textContent(entryObject.updated);
    const published = textContent(entryObject.published);

    if (!id) throw new Error("Invalid Atom entry: missing id text");
    if (ids.has(id)) throw new Error(`Invalid Atom feed: duplicate id ${id}`);
    ids.add(id);

    if (!updated || !rfc3339DateTime.test(updated)) {
      throw new Error(`Invalid Atom entry: updated is not RFC3339`);
    }

    if (published && !rfc3339DateTime.test(published)) {
      throw new Error(`Invalid Atom entry: published is not RFC3339`);
    }

    const content = entryObject.content;
    if (
      !content ||
      typeof content !== "object" ||
      (content as { "@_type"?: unknown })["@_type"] !== "html"
    ) {
      throw new Error("Invalid Atom entry: content must be escaped HTML");
    }
  }
};

const sitemapXml = async () => {
  const urls: {
    loc: string;
    lastmod?: string;
    changefreq: string;
    priority: string;
  }[] = [
    {
      loc: absoluteUrl("/"),
      changefreq: "weekly",
      priority: "1.0",
    },
    ...(await blogs()).map((blog) => ({
      loc: absoluteUrl(blogUrl(blog.slug)),
      lastmod: lastModifiedDate(blog.latestModifiedAt),
      changefreq: "monthly",
      priority: "0.8",
    })),
  ];

  return `${[
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) =>
      [
        "  <url>",
        `    <loc>${xmlEscape(url.loc)}</loc>`,
        url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : undefined,
        `    <changefreq>${url.changefreq}</changefreq>`,
        `    <priority>${url.priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "</urlset>",
  ].join("\n")}\n`;
};

const robotsTxt = () => {
  return `${[
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
  ].join("\n")}\n`;
};

const llmsTxt = async () => {
  const blogLinks = (await blogs()).map((blog) => {
    return [
      `- [${markdownEscape(blog.title)}](${absoluteUrl(blogUrl(blog.slug))})`,
      `  - Markdown: [source](${absoluteUrl(blog.publicPath)})`,
    ].join("\n");
  });

  return `${[
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "This static blog is authored in Markdown and rendered to HTML at build time. Use the canonical HTML URLs for normal web browsing and the Markdown source URLs when plain-text context is preferable.",
    "",
    "## Site files",
    "",
    `- [Sitemap](${absoluteUrl("/sitemap.xml")})`,
    `- [Atom feed](${absoluteUrl("/atom.xml")})`,
    "",
    "## Blog posts",
    "",
    ...blogLinks,
  ].join("\n")}\n`;
};

const atomArchivePath = (index: number) => {
  return `/atom/archive/${index}.xml`;
};

const atomEntryXml = async (blog: BlogFile) => {
  const url = absoluteUrl(blogUrl(blog.slug));
  const publishedAt = dateTime(blog.time);
  const updatedAt = dateTime(blog.latestModifiedAt ?? blog.time);
  const markdownUrl = absoluteUrl(blog.publicPath);
  const html = atomContentHtml(String(await contentHtml(blog)), url);

  return [
    "  <entry>",
    `    <id>${xmlEscape(url)}</id>`,
    `    <title>${xmlEscape(blog.title)}</title>`,
    `    <link href="${xmlEscape(url)}" rel="alternate" type="text/html" hreflang="${SITE_LANGUAGE}" />`,
    `    <link href="${xmlEscape(markdownUrl)}" rel="alternate" type="text/markdown" hreflang="${SITE_LANGUAGE}" title="Markdown source" />`,
    `    <published>${publishedAt}</published>`,
    `    <updated>${updatedAt}</updated>`,
    `    <content type="html">${xmlEscape(html)}</content>`,
    "  </entry>",
  ].join("\n");
};

const atomFeedUpdatedAt = (feedBlogs: BlogFile[]) => {
  if (feedBlogs.length === 0) return dateTime(new Date());

  return dateTime(
    Math.max(
      ...feedBlogs.map((blog) =>
        new Date(blog.latestModifiedAt ?? blog.time).getTime(),
      ),
    ),
  );
};

const atomFeedXml = async (options: {
  additionalLinks?: string[];
  isArchive?: boolean;
  selfPath: string;
  title?: string;
  blogs: BlogFile[];
}) => {
  const blogEntries = await Promise.all(options.blogs.map(atomEntryXml));
  const feedUpdatedAt = atomFeedUpdatedAt(options.blogs);
  const archiveAttributes = options.isArchive
    ? ` xmlns:fh="${feedHistoryNamespace}"`
    : "";
  const archiveElement = options.isArchive ? "  <fh:archive/>" : undefined;
  const xml = `${[
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<feed xmlns="http://www.w3.org/2005/Atom"${archiveAttributes} xml:base="${absoluteUrl("/")}" xml:lang="${SITE_LANGUAGE}">`,
    `  <id>${xmlEscape(absoluteUrl("/"))}</id>`,
    `  <title>${xmlEscape(options.title ?? SITE_NAME)}</title>`,
    `  <subtitle>${xmlEscape(SITE_DESCRIPTION)}</subtitle>`,
    `  <link href="${xmlEscape(absoluteUrl("/"))}" rel="alternate" type="text/html" hreflang="${SITE_LANGUAGE}" />`,
    `  <link href="${xmlEscape(absoluteUrl(options.selfPath))}" rel="self" type="application/atom+xml" />`,
    archiveElement,
    ...(options.additionalLinks ?? []),
    `  <updated>${feedUpdatedAt}</updated>`,
    "  <author>",
    `    <name>${SITE_AUTHOR}</name>`,
    "  </author>",
    `  <generator uri="https://github.com/YKDZ/blog">${SITE_DESCRIPTION}</generator>`,
    ...blogEntries,
    "</feed>",
  ]
    .filter(Boolean)
    .join("\n")}\n`;

  validateAtomXml(xml);

  return xml;
};

export const atomFeedDocuments = async (providedBlogs?: BlogFile[]) => {
  const allBlogs = providedBlogs ?? (await blogs());
  const recentLimit = Math.max(1, ATOM_RECENT_LIMIT);
  const recentBlogs = allBlogs.slice(0, recentLimit);
  const archiveChunks = chunks(allBlogs.slice(recentLimit), recentLimit);
  const archiveDocuments = await Promise.all(
    archiveChunks.map(async (archiveBlogs, index) => {
      const archiveIndex = index + 1;
      const links = [
        `  <link href="${xmlEscape(absoluteUrl("/atom.xml"))}" rel="current" type="application/atom+xml" />`,
        archiveIndex < archiveChunks.length
          ? `  <link href="${xmlEscape(absoluteUrl(atomArchivePath(archiveIndex + 1)))}" rel="prev-archive" type="application/atom+xml" />`
          : undefined,
        archiveIndex > 1
          ? `  <link href="${xmlEscape(absoluteUrl(atomArchivePath(archiveIndex - 1)))}" rel="next-archive" type="application/atom+xml" />`
          : undefined,
      ].filter((link): link is string => Boolean(link));

      return {
        path: atomArchivePath(archiveIndex),
        xml: await atomFeedXml({
          additionalLinks: links,
          blogs: archiveBlogs,
          isArchive: true,
          selfPath: atomArchivePath(archiveIndex),
          title: `${SITE_NAME} archive ${archiveIndex}`,
        }),
      };
    }),
  );

  const currentLinks =
    archiveDocuments.length > 0
      ? [
          `  <link href="${xmlEscape(absoluteUrl(atomArchivePath(1)))}" rel="prev-archive" type="application/atom+xml" />`,
        ]
      : [];

  return [
    {
      path: "/atom.xml",
      xml: await atomFeedXml({
        additionalLinks: currentLinks,
        blogs: recentBlogs,
        selfPath: "/atom.xml",
      }),
    },
    ...archiveDocuments,
  ];
};

export const generateSiteMetadata = async () => {
  await mkdir(outputDir, { recursive: true });
  await mkdir(atomArchiveOutputDir, { recursive: true });
  const atomDocuments = await atomFeedDocuments();

  await Promise.all([
    writeFile(resolve(outputDir, "robots.txt"), robotsTxt()),
    writeFile(resolve(outputDir, "sitemap.xml"), await sitemapXml()),
    writeFile(resolve(outputDir, "llms.txt"), await llmsTxt()),
    ...atomDocuments.map((document) =>
      writeFile(resolve(outputDir, document.path.slice(1)), document.xml),
    ),
  ]);
};

export const siteMetadataPlugin = (): Plugin => {
  return {
    name: "vite-plugin-site-metadata",
    apply: "build",
    async closeBundle() {
      await generateSiteMetadata();
    },
  };
};
