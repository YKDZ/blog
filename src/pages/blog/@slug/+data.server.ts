import type { PageContextServer } from "vike/types";

import { articleBabelSummary, blogLibrary } from "../../../lib/babel/articles";
import { toBase62 } from "../../../lib/babel/base62";
import { contentHtml, getBlog, publicBlogMetadata } from "./lib";
import type { BlogPageData } from "./types";

export const data = async (ctx: PageContextServer): Promise<BlogPageData> => {
  const slug = ctx.routeParams["slug"];

  if (!slug) throw new Error("No Slug Provided in routeParams");

  const blog = await getBlog(slug);
  const library = await blogLibrary();
  const summary = articleBabelSummary(library, blog.content);

  return {
    blog: publicBlogMetadata(blog),
    html: String(await contentHtml(blog)),
    babel: {
      location: {
        hexagon: toBase62(summary.location.hexagon),
        wall: summary.location.wall,
        shelfOnWall: summary.location.shelfOnWall,
        volume: summary.location.volume,
      },
    },
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
