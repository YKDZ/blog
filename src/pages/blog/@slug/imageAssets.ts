import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import path, { dirname, extname, resolve, sep } from "node:path";
import { cwd } from "node:process";

import sharp from "sharp";

export const PUBLIC_DIR = resolve(cwd(), "public");
const BLOGS_DIR = resolve(PUBLIC_DIR, "blogs");
const OPTIMIZED_IMAGES_DIR = resolve(PUBLIC_DIR, "optimized-images");
const rasterImageExtensions = new Set([".jpg", ".jpeg", ".png"]);

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

const optimizedImagePath = (filePath: string, content: Buffer) => {
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  const parsed = path.parse(relativePath);
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);

  return resolve(
    OPTIMIZED_IMAGES_DIR,
    parsed.dir,
    `${parsed.name}.${hash}.webp`,
  );
};

export const optimizedImageForPath = async (
  filePath: string,
): Promise<
  | {
      optimizedUrl: string;
      originalUrl: string;
    }
  | undefined
> => {
  if (!isRasterImagePath(filePath) || !existsSync(filePath)) return;

  const content = await readFile(filePath);
  const outputPath = optimizedImagePath(filePath, content);

  if (!existsSync(outputPath)) {
    await mkdir(dirname(outputPath), { recursive: true });
    await sharp(content).webp({ quality: 82 }).toFile(outputPath);
  }

  return {
    optimizedUrl: publicUrlFromPath(outputPath),
    originalUrl: publicUrlFromPath(filePath),
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
  const pattern =
    /!\[[^\]\n]*\]\(([^)<> \t\n][^)\n]*?)(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?\)/g;

  for (const match of content.matchAll(pattern)) {
    const url = match[1]?.trimEnd();

    if (!url) continue;

    const { pathname } = splitUrl(url);

    if (!pathname || /^[a-z][a-z\d+.-]*:/i.test(pathname)) continue;
    if (
      pathname.startsWith("#") ||
      pathname.startsWith("/") ||
      pathname.startsWith("//")
    ) {
      continue;
    }

    imagePaths.add(
      resolveMarkdownReference(fromFilePath, decodePathname(pathname)),
    );
  }

  return imagePaths;
};

export const optimizeBlogImages = async () => {
  if (!existsSync(BLOGS_DIR)) return;

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
              await optimizedImageForPath(imagePath);
            },
          ),
        );
      }),
  );
};
