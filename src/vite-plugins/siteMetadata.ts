import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cwd } from "node:process";

import { SyntaxValidator } from "fast-xml-validator";
import type { Plugin } from "vite";

import { blogUrl, blogs, contentHtml } from "../pages/blog/@slug/lib";
import {
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_ORIGIN,
} from "../site";

const outputDir = resolve(cwd(), "dist", "client");

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

const atomContentGlobalAttributes = new Set(["id", "title"]);
const atomContentTagAttributes = new Map([
  ["a", new Set(["href"])],
  ["img", new Set(["alt", "height", "sizes", "src", "srcset", "width"])],
]);

export const absolutizeHtmlUrls = (html: string, baseUrl: string) => {
  return html.replaceAll(
    /\s(?<attribute>href|src|srcset)=["'](?<value>[^"']*)["']/gi,
    (_match, attribute: string, value: string) => {
      const normalizedValue =
        attribute.toLowerCase() === "srcset"
          ? absolutizeSrcset(value, baseUrl)
          : absolutizeUrl(value, baseUrl);

      return ` ${attribute}="${normalizedValue}"`;
    },
  );
};

const isAllowedAtomContentAttribute = (tagName: string, attribute: string) => {
  const normalizedAttribute = attribute.toLowerCase();

  return (
    atomContentGlobalAttributes.has(normalizedAttribute) ||
    (atomContentTagAttributes.get(tagName)?.has(normalizedAttribute) ?? false)
  );
};

const cleanHtmlAttributesForAtom = (attributes: string, tagName: string) => {
  const cleanAttributes: string[] = [];
  const pattern =
    /(?<name>[\w:-]+)(?:=(?<quote>["'])(?<quoted>.*?)\k<quote>|=(?<unquoted>[^\s>]+))?/g;

  for (const match of attributes.matchAll(pattern)) {
    const name = match.groups?.["name"];

    if (!name || !isAllowedAtomContentAttribute(tagName, name)) continue;

    const value = match.groups?.["quoted"] ?? match.groups?.["unquoted"];

    if (value === undefined) continue;

    cleanAttributes.push(`${name.toLowerCase()}="${value}"`);
  }

  return cleanAttributes.length > 0 ? ` ${cleanAttributes.join(" ")}` : "";
};

export const atomContentHtml = (html: string, baseUrl: string) => {
  return absolutizeHtmlUrls(
    html
      .replaceAll(
        /<a\b[^>]*\sdata-heading-anchor(?:=["'][^"']*["'])?[^>]*>[\s\S]*?<\/a>/gi,
        "",
      )
      .replaceAll(
        /<(?<closing>\/?)(?<tagName>[a-z][\w:-]*)(?<attributes>[^>]*)>/gi,
        (match, closing: string, tagName: string, attributes: string) => {
          if (closing) return `</${tagName.toLowerCase()}>`;

          return `<${tagName.toLowerCase()}${cleanHtmlAttributesForAtom(attributes, tagName.toLowerCase())}>`;
        },
      ),
    baseUrl,
  );
};

const textContentForElement = (xml: string, element: string) => {
  const match = xml.match(
    new RegExp(`<${element}(?:\\s[^>]*)?>(?<content>[\\s\\S]*?)</${element}>`),
  );

  return match?.groups?.["content"];
};

const countElements = (xml: string, element: string) => {
  return xml.match(new RegExp(`<${element}(?:\\s|>)`, "g"))?.length ?? 0;
};

export const validateAtomXml = (xml: string) => {
  const xmlValidation = SyntaxValidator.validate(xml);
  if (xmlValidation !== true) {
    throw new Error(
      `Invalid Atom XML: ${xmlValidation.err.msg} at ${xmlValidation.err.line}:${xmlValidation.err.col}`,
    );
  }

  const requiredSnippets = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom"',
    'xml:base="https://ykdz.me/"',
    `xml:lang="${SITE_LANGUAGE}"`,
    '<link href="https://ykdz.me/atom.xml" rel="self" type="application/atom+xml" />',
  ];

  for (const snippet of requiredSnippets) {
    if (!xml.includes(snippet)) {
      throw new Error(`Invalid Atom feed: missing ${snippet}`);
    }
  }

  for (const element of ["id", "title", "updated"]) {
    if (countElements(xml, element) === 0) {
      throw new Error(`Invalid Atom feed: missing ${element}`);
    }
  }

  const feedUpdated = textContentForElement(xml, "updated");
  if (!feedUpdated || !rfc3339DateTime.test(feedUpdated)) {
    throw new Error(`Invalid Atom feed: updated is not RFC3339`);
  }

  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const ids = new Set<string>();

  for (const entry of entries) {
    for (const element of ["id", "title", "updated", "content"]) {
      if (countElements(entry, element) !== 1) {
        throw new Error(`Invalid Atom entry: expected one ${element}`);
      }
    }

    const id = textContentForElement(entry, "id");
    const updated = textContentForElement(entry, "updated");
    const published = textContentForElement(entry, "published");

    if (!id) throw new Error("Invalid Atom entry: missing id text");
    if (ids.has(id)) throw new Error(`Invalid Atom feed: duplicate id ${id}`);
    ids.add(id);

    if (!updated || !rfc3339DateTime.test(updated)) {
      throw new Error(`Invalid Atom entry: updated is not RFC3339`);
    }

    if (published && !rfc3339DateTime.test(published)) {
      throw new Error(`Invalid Atom entry: published is not RFC3339`);
    }

    if (!entry.includes('<content type="html">')) {
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

const atomXml = async () => {
  const allBlogs = await blogs();
  const blogEntries = await Promise.all(
    allBlogs.map(async (blog) => {
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
        `    <link href="${xmlEscape(markdownUrl)}" rel="alternate" type="text/markdown" title="Markdown source" />`,
        `    <published>${publishedAt}</published>`,
        `    <updated>${updatedAt}</updated>`,
        `    <content type="html">${xmlEscape(html)}</content>`,
        "  </entry>",
      ].join("\n");
    }),
  );

  const feedUpdatedAt =
    allBlogs.length === 0
      ? dateTime(new Date())
      : dateTime(
          Math.max(
            ...allBlogs.map((blog) =>
              new Date(blog.latestModifiedAt ?? blog.time).getTime(),
            ),
          ),
        );

  const xml = `${[
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:base="${absoluteUrl("/")}" xml:lang="${SITE_LANGUAGE}">`,
    `  <id>${xmlEscape(absoluteUrl("/"))}</id>`,
    `  <title>${xmlEscape(SITE_NAME)}</title>`,
    `  <subtitle>${xmlEscape(SITE_DESCRIPTION)}</subtitle>`,
    `  <link href="${xmlEscape(absoluteUrl("/"))}" rel="alternate" type="text/html" hreflang="${SITE_LANGUAGE}" />`,
    `  <link href="${xmlEscape(absoluteUrl("/atom.xml"))}" rel="self" type="application/atom+xml" />`,
    `  <updated>${feedUpdatedAt}</updated>`,
    "  <author>",
    "    <name>YKDZ</name>",
    "  </author>",
    '  <generator uri="https://github.com/YKDZ/blog">ykdz.me static site build</generator>',
    ...blogEntries,
    "</feed>",
  ].join("\n")}\n`;

  validateAtomXml(xml);

  return xml;
};

export const generateSiteMetadata = async () => {
  await mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeFile(resolve(outputDir, "robots.txt"), robotsTxt()),
    writeFile(resolve(outputDir, "sitemap.xml"), await sitemapXml()),
    writeFile(resolve(outputDir, "llms.txt"), await llmsTxt()),
    writeFile(resolve(outputDir, "atom.xml"), await atomXml()),
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
