import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path, { resolve, sep } from "node:path";
import { cwd } from "node:process";
import { promisify } from "node:util";

import type { Root, RootContent } from "mdast";
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeSchema,
} from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type Plugin } from "unified";

import { normalizeMarkdownResourceUrls } from "./markdownResources";
import rehypeCodeHighlight from "./plugins/codeHighlight";
import rehypeHeadingId from "./plugins/headingId";
import rehypeLinkTarget from "./plugins/linkTarget";
import remarkUrlTransform from "./plugins/urlTransform";
import type { Blog, BlogListItem, BlogMetadata } from "./types";

const execFileAsync = promisify(execFile);

const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.["a"] ?? []),
      ["target", "_blank"],
      ["rel", "noopener", "noreferrer"],
    ],
    img: [
      ...(defaultSchema.attributes?.["img"] ?? []),
      "height",
      "loading",
      "sizes",
      "srcset",
      "srcSet",
      "width",
    ],
  },
  clobberPrefix: "",
};

const textContent = (node: RootContent): string => {
  if ("value" in node && typeof node.value === "string") return node.value;
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.map(textContent).join("");
  }

  return "";
};

const markdownAst = (content: string): Root => {
  const processor = unified().use(remarkParse).use(remarkGfm);

  return processor.parse(normalizeMarkdownResourceUrls(content)) as Root;
};

const remarkRemoveFirstHeading: Plugin<[], Root> = () => {
  return function (tree) {
    const index = tree.children.findIndex((child) => child.type === "heading");

    if (index !== -1) tree.children.splice(index, 1);
  };
};

export const contentHtml = async (blog: BlogFile) => {
  const html = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRemoveFirstHeading)
    .use(remarkUrlTransform, { blog })
    .use(remarkCjkFriendly)
    .use(remarkRehype)
    .use(rehypeLinkTarget)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeCodeHighlight)
    .use(rehypeHeadingId)
    .use(rehypeStringify)
    .process(normalizeMarkdownResourceUrls(blog.content));

  return html;
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

export { normalizeMarkdownResourceUrls };

export const firstMarkdownHeading = (content: string): string | undefined => {
  const heading = markdownAst(content).children.find(
    (child) => child.type === "heading",
  );

  if (!heading) return undefined;

  const title = textContent(heading).trim();

  return title || undefined;
};

const truncateDescription = (description: string, maxLength = 160) => {
  if (description.length <= maxLength) return description;

  return `${description.slice(0, maxLength).trimEnd()}...`;
};

export const markdownDescription = (content: string): string | undefined => {
  const children = markdownAst(content).children;
  const firstHeadingIndex = children.findIndex(
    (child) => child.type === "heading",
  );
  const description = children
    .slice(firstHeadingIndex === -1 ? 0 : firstHeadingIndex + 1)
    .filter((child) => child.type === "paragraph")
    .map(textContent)
    .map((text) => text.replace(/\s+/g, " ").trim())
    .find(Boolean);

  return description ? truncateDescription(description) : undefined;
};

export const stripFirstMarkdownHeading = (content: string): string => {
  const tree = markdownAst(content);
  const firstHeading = tree.children.find((child) => child.type === "heading");

  if (!firstHeading?.position) return content;

  return [
    content.slice(0, firstHeading.position.start.offset),
    content.slice(firstHeading.position.end.offset),
  ]
    .join("")
    .replace(/^\s*\r?\n/, "");
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
    description: markdownDescription(options.content) || options.slug,
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
    description:
      blog.description || markdownDescription(blog.content) || blog.slug,
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
    description:
      blog.description || markdownDescription(blog.content) || blog.slug,
    markdownPath: blog.publicPath,
    latestModifiedAt: blog.latestModifiedAt,
  };
};

export const publicBlogListItem = (blog: BlogFile): BlogListItem => {
  return {
    time: blog.time,
    slug: blog.slug,
    title: blog.title,
    description:
      blog.description || markdownDescription(blog.content) || blog.slug,
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
