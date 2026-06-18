import { blogs, publicBlogListItem } from "./blog/@slug/lib";
import type { BlogListItem } from "./blog/@slug/types";

export const data = async (): Promise<{
  blogs: BlogListItem[];
}> => {
  return {
    blogs: (await blogs()).map(publicBlogListItem),
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
