import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDir = resolve(".vercel-deploy/.vercel/output");
const staticDir = resolve(outputDir, "static");

await rm(outputDir, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });
await cp(resolve("dist/client"), staticDir, { recursive: true });

await writeFile(
  resolve(outputDir, "config.json"),
  `${JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", status: 404, dest: "/404.html" },
      ],
    },
    null,
    2,
  )}\n`,
);
