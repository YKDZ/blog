import type { PageContextServer } from "vike/types";

import { blogs, contentHtml, getBlog, publicBlog } from "./lib";
import type { BlogPageData } from "./types";

export const data = async (ctx: PageContextServer): Promise<BlogPageData> => {
  const slug = ctx.routeParams["slug"];

  if (!slug) throw new Error("No Slug Provided in routeParams");

  const blog = await getBlog(slug);
  const allBlogs = await blogs();

  return {
    blog: publicBlog(blog),
    html: String(await contentHtml(blog)),
    previews: await Promise.all(
      allBlogs.map(async (blog) => ({
        slug: blog.slug,
        title: blog.title,
        html: String(await contentHtml(blog)),
      })),
    ),
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
