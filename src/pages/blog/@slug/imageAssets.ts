import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import path, { dirname, extname, resolve, sep } from "node:path";
import { cwd } from "node:process";

import type { Image, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import sharp from "sharp";
import { unified } from "unified";
import { visit } from "unist-util-visit";

import { normalizeMarkdownResourceUrls } from "./markdownResources";

export const PUBLIC_DIR = resolve(cwd(), "public");
const BLOGS_DIR = resolve(PUBLIC_DIR, "blogs");
const OPTIMIZED_IMAGES_DIR = resolve(PUBLIC_DIR, "optimized-images");
const rasterImageExtensions = new Set([".jpg", ".jpeg", ".png"]);
const responsiveImageWidths = [480, 640, 672, 768, 1024, 1280, 1600, 1920];
const imageSizes = "(max-width: 767px) 100vw, 672px";
const fallbackImageWidth = 672;
const URL_WITH_SCHEME = /^[a-z][a-z\d+.-]*:/i;

export type BlogImageAsset = {
  srcUrl: string;
  width?: number;
  height?: number;
  srcSet?: string;
  sizes?: string;
};

const encodeUrlPath = (urlPath: string): string => {
  return urlPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
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

const isRasterImagePath = (filePath: string) => {
  return rasterImageExtensions.has(extname(filePath).toLowerCase());
};

const optimizedImagePath = (
  filePath: string,
  content: Buffer,
  width: number,
) => {
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  const parsed = path.parse(relativePath);
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);

  return resolve(OPTIMIZED_IMAGES_DIR, parsed.dir, `${hash}.${width}w.webp`);
};

const outputWidths = (width: number) => {
  const widths = responsiveImageWidths.filter((candidate) => candidate < width);
  return [...widths, width];
};

export const imageAssetForPath = async (
  filePath: string,
): Promise<BlogImageAsset | undefined> => {
  if (!existsSync(filePath)) return;

  const content = await readFile(filePath);
  const metadata = await sharp(content).metadata();
  const width = metadata.width;
  const height = metadata.height;

  if (!isRasterImagePath(filePath) || !width || !height) {
    return {
      srcUrl: publicUrlFromPath(filePath),
      width,
      height,
    };
  }

  const variants = await Promise.all(
    outputWidths(width).map(async (variantWidth) => {
      const outputPath = optimizedImagePath(filePath, content, variantWidth);

      if (!existsSync(outputPath)) {
        await mkdir(dirname(outputPath), { recursive: true });
        await sharp(content)
          .resize({
            width: variantWidth,
            withoutEnlargement: true,
          })
          .webp({ quality: 80 })
          .toFile(outputPath);
      }

      return {
        width: variantWidth,
        url: publicUrlFromPath(outputPath),
      };
    }),
  );
  const fallback =
    variants.find((variant) => variant.width >= fallbackImageWidth) ??
    variants.at(-1);

  if (!fallback) return;

  return {
    srcUrl: fallback.url,
    width,
    height,
    srcSet: variants
      .map((variant) => `${variant.url} ${variant.width}w`)
      .join(", "),
    sizes: imageSizes,
  };
};

const splitUrl = (url: string) => {
  const match = /^(?<pathname>[^?#]*)(?<query>\?[^#]*)?(?<hash>#.*)?$/.exec(
    url,
  );

  return {
    pathname: match?.groups?.["pathname"] ?? url,
    query: match?.groups?.["query"] ?? "",
    hash: match?.groups?.["hash"] ?? "",
  };
};

const decodePathname = (pathname: string) => {
  try {
    return decodeURI(pathname);
  } catch {
    return pathname;
  }
};

const resolveMarkdownReference = (fromFilePath: string, pathname: string) => {
  if (pathname === "public") {
    return PUBLIC_DIR;
  }

  if (pathname.startsWith("public/")) {
    return resolve(PUBLIC_DIR, pathname.slice("public/".length));
  }

  return resolve(dirname(fromFilePath), pathname);
};

const referencedImagePaths = (fromFilePath: string, content: string) => {
  const imagePaths = new Set<string>();
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(normalizeMarkdownResourceUrls(content)) as Root;

  visit(tree, "image", (node: Image) => {
    const url = node.url.trimEnd();

    const { pathname } = splitUrl(url);

    if (!pathname || URL_WITH_SCHEME.test(pathname)) return;
    if (
      pathname.startsWith("#") ||
      pathname.startsWith("/") ||
      pathname.startsWith("//")
    ) {
      return;
    }

    imagePaths.add(
      resolveMarkdownReference(fromFilePath, decodePathname(pathname)),
    );
  });

  return imagePaths;
};

export const optimizeBlogImages = async () => {
  if (!existsSync(BLOGS_DIR)) return;

  await rm(OPTIMIZED_IMAGES_DIR, { recursive: true, force: true });

  const blogDirs = await readdir(BLOGS_DIR, {
    recursive: false,
    withFileTypes: true,
  });

  await Promise.all(
    blogDirs
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const filePath = resolve(BLOGS_DIR, entry.name, "index.md");

        if (!existsSync(filePath)) return;

        const content = await readFile(filePath, "utf-8");
        await Promise.all(
          [...referencedImagePaths(filePath, content)].map(
            async (imagePath) => {
              if (!existsSync(imagePath)) return;
              if (!(await stat(imagePath)).isFile()) return;
              await imageAssetForPath(imagePath);
            },
          ),
        );
      }),
  );
};
