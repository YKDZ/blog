import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path, { resolve, sep } from "node:path";
import { cwd } from "node:process";
import { promisify } from "node:util";

import { renderMarkdown } from "../../../lib/markdown";
import {
  descriptionWithFallback,
  metadataWithFallback,
} from "../../../lib/markdownMetadata";
import remarkUrlTransform from "./plugins/urlTransform";
import type { Blog, BlogListItem, BlogMetadata } from "./types";

const execFileAsync = promisify(execFile);

export const contentHtml = async (blog: BlogFile) => {
  return renderMarkdown(blog.content, {
    removeFirstHeading: true,
    applyPlugin: (processor) => processor.use(remarkUrlTransform, { blog }),
  });
};

export type BlogFile = Omit<Blog, "description" | "markdownPath"> & {
  description?: string;
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
  return `/blog/${slug}/${hash}`;
};

const encodeUrlPath = (urlPath: string): string => {
  return urlPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
};

export { normalizeMarkdownResourceUrls } from "./markdownResources";

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
  const metadata = metadataWithFallback(options.content);

  return {
    filePath: options.filePath,
    publicPath: publicUrlFromPath(options.filePath),
    time: Number(options.dirname.split("-", 1)),
    slug: options.slug,
    title: metadata.title,
    description: metadata.description,
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
    description: blog.description || descriptionWithFallback(blog.content),
    content: blog.content,
    markdownPath: blog.publicPath,
    latestModifiedAt: blog.latestModifiedAt,
  };
};

export const publicBlogMetadata = (blog: BlogFile): BlogMetadata => {
  return {
    time: blog.time,
    slug: blog.slug,
    title: blog.title,
    description: blog.description || descriptionWithFallback(blog.content),
    markdownPath: blog.publicPath,
    latestModifiedAt: blog.latestModifiedAt,
  };
};

export const publicBlogListItem = (blog: BlogFile): BlogListItem => {
  return {
    time: blog.time,
    slug: blog.slug,
    title: blog.title,
    description: blog.description || descriptionWithFallback(blog.content),
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
