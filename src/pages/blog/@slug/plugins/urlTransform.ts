import { dirname, extname, resolve } from "node:path";

import type { Image, Link, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

import {
  blogUrl,
  PUBLIC_DIR,
  publicUrlFromPath,
  slugFromDirName,
  type BlogFile,
} from "../lib";

const URL_WITH_SCHEME = /^[a-z][a-z\d+.-]*:/i;

const isPassthroughUrl = (url: string) => {
  return (
    url.startsWith("#") ||
    url.startsWith("/") ||
    url.startsWith("//") ||
    URL_WITH_SCHEME.test(url)
  );
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

const slugFromMarkdownPath = (filePath: string) => {
  const blogDir = dirname(filePath);
  return slugFromDirName(blogDir.split(/[\\/]/).at(-1) ?? "");
};

const resolvePublicReference = (fromFilePath: string, pathname: string) => {
  if (pathname === "public") {
    return PUBLIC_DIR;
  }

  if (pathname.startsWith("public/")) {
    return resolve(PUBLIC_DIR, pathname.slice("public/".length));
  }

  return resolve(dirname(fromFilePath), pathname);
};

type UrlTransformOptions = {
  blog: BlogFile;
};

const isUrlNode = (node: unknown): node is Image | Link => {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node.type === "link" || node.type === "image") &&
    "url" in node &&
    typeof node.url === "string"
  );
};

/**
 * 将文章内所有相对路径引用解析为前端可直接使用的 public URL。
 */
const remarkUrlTransform: Plugin<[UrlTransformOptions], Root> = (options) => {
  return function (tree) {
    visit(tree, ["link", "image"], function (node) {
      if (!isUrlNode(node) || isPassthroughUrl(node.url)) {
        return;
      }

      const { pathname, query, hash } = splitUrl(node.url);

      if (!pathname) return;

      const decodedPathname = decodePathname(pathname);
      const refPath = resolvePublicReference(
        options.blog.filePath,
        decodedPathname,
      );

      if (node.type === "link" && extname(decodedPathname) === ".md") {
        const slug = slugFromMarkdownPath(refPath);

        if (!slug)
          throw new Error(`No blog slug in referred blog: ${node.url}`);

        node.url = blogUrl(slug, hash);
        return;
      }

      node.url = `${publicUrlFromPath(refPath)}${query}${hash}`;
    });
  };
};

export default remarkUrlTransform;
