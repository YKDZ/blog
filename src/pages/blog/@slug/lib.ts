import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path, { resolve, sep } from "node:path";
import { cwd } from "node:process";
import { promisify } from "node:util";

import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import rehypeCodeHighlight from "./plugins/codeHighlight";
import rehypeHeadingId from "./plugins/headingId";
import remarkUrlTransform from "./plugins/urlTransform";
import type { Blog } from "./types";

const execFileAsync = promisify(execFile);

const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: "",
};

export const contentHtml = async (blog: BlogFile) => {
  const html = await unified()
    .use(remarkParse)
    .use(remarkUrlTransform, { blog })
    .use(remarkGfm)
    .use(remarkCjkFriendly)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeCodeHighlight)
    .use(rehypeHeadingId)
    .use(rehypeStringify)
    .process(
      normalizeMarkdownResourceUrls(stripFirstMarkdownHeading(blog.content)),
    );

  return html;
};

export type BlogFile = Blog & {
  filePath: string;
  publicPath: string;
};

export const PUBLIC_DIR = resolve(cwd(), "public");
export const BLOGS_DIR = resolve(cwd(), "public", "blogs");

export const isValidSlug = (slug: string) => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

export const slugFromDirName = (dirname: string): string => {
  return dirname.replace(/^\d+-/, "");
};

export const blogUrl = (slug: string, hash = ""): string => {
  return `/blog/${slug}${hash}`;
};

const encodeUrlPath = (urlPath: string): string => {
  return urlPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
};

export const normalizeMarkdownResourceUrls = (content: string): string => {
  return content.replace(
    /(!?\[[^\]\n]*\]\()([^)<> \t\n][^)\n]*?)(\s+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?(\))/g,
    (
      _,
      open: string,
      url: string,
      title: string | undefined,
      close: string,
    ) => {
      return `${open}${url.trimEnd().replace(/\s+/g, "%20")}${title ?? ""}${close}`;
    },
  );
};

export const firstMarkdownHeading = (content: string): string | undefined => {
  const heading = content.match(/^#{1,6}\s+(?<title>.+?)\s*#*\s*$/m);
  return heading?.groups?.["title"]?.trim();
};

export const stripFirstMarkdownHeading = (content: string): string => {
  return content.replace(/^#{1,6}\s+.+?\s*#*\s*(?:\r?\n|$)/m, "");
};

export const publicUrlFromPath = (filePath: string): string => {
  const relativePath = path.relative(PUBLIC_DIR, filePath);

  if (
    relativePath === "" ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath === ".." ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Referenced file is outside public: ${filePath}`);
  }

  return `/${encodeUrlPath(relativePath.split(sep).join("/"))}`;
};

export const dirnameFromSlug = async (
  slug: string,
): Promise<string | undefined> => {
  const i = (await readdir(BLOGS_DIR, { recursive: false })).find(
    (dirname) => slugFromDirName(dirname) === slug,
  );
  return i;
};

const blogFromFile = (options: {
  filePath: string;
  dirname: string;
  slug: string;
  content: string;
  latestModifiedAt?: string;
}): BlogFile => {
  return {
    filePath: options.filePath,
    publicPath: publicUrlFromPath(options.filePath),
    time: Number(options.dirname.split("-", 1)),
    slug: options.slug,
    title: firstMarkdownHeading(options.content) || options.slug,
    content: options.content,
    latestModifiedAt: options.latestModifiedAt,
  };
};

export const latestModifiedAt = async (
  filePath: string,
): Promise<string | undefined> => {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "-1", "--format=%cI", "--", filePath],
      { cwd: cwd() },
    );
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
};

export const getBlog = async (slug: string) => {
  const dirname = await dirnameFromSlug(slug);

  if (!dirname) throw new Error(`No blog with provided slug ${slug}`);

  const filePath = resolve(BLOGS_DIR, dirname, "index.md");
  const content = await readFile(filePath, {
    encoding: "utf-8",
  });

  return blogFromFile({
    filePath,
    dirname,
    slug,
    content,
    latestModifiedAt: await latestModifiedAt(filePath),
  });
};

export const publicBlog = (blog: BlogFile): Blog => {
  return {
    time: blog.time,
    slug: blog.slug,
    title: blog.title,
    content: blog.content,
    latestModifiedAt: blog.latestModifiedAt,
  };
};

export const blogs = async (): Promise<BlogFile[]> => {
  const allBlogs = await Promise.all(
    (await readdir(BLOGS_DIR, { recursive: false, withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => getBlog(slugFromDirName(entry.name))),
  );

  return allBlogs.sort((a, b) => b.time - a.time);
};
