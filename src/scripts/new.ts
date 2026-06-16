import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  BLOGS_DIR,
  dirnameFromSlug,
  isValidSlug,
} from "../pages/blog/@slug/lib";

const now = Date.now();
const args = process.argv.slice(2);

if (args.length === 0) throw new Error("必须为文章提供一个 Slug");

const slug = args[0]!;

if (!slug.length) throw new Error("Slug 长度必须大于 0");
if (!isValidSlug(slug)) throw new Error("Slug 必须是合法的 Url 组成部分");

const existsDir = await dirnameFromSlug(slug);

if (existsDir) throw new Error("Slug 已经出现过了");

const dirname = `${now}-${slug}`;
const path = resolve(BLOGS_DIR, dirname);
const assetsPath = resolve(path, "assets");
const indexPath = resolve(path, "index.md");

await mkdir(path);
await mkdir(assetsPath);
await writeFile(indexPath, "# ");

console.log(indexPath);
