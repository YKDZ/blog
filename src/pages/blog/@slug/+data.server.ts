import type { PageContextServer } from "vike/types";

import { contentHtml, getBlog, publicBlogMetadata } from "./lib";
import type { BlogPageData } from "./types";

export const data = async (ctx: PageContextServer): Promise<BlogPageData> => {
  const slug = ctx.routeParams["slug"];

  if (!slug) throw new Error("No Slug Provided in routeParams");

  const blog = await getBlog(slug);

  return {
    blog: publicBlogMetadata(blog),
    html: String(await contentHtml(blog)),
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
