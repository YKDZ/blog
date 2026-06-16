import { blogs, publicBlog } from "./blog/@slug/lib";
import type { Blog } from "./blog/@slug/types";

export const data = async (): Promise<{
  blogs: Blog[];
}> => {
  return {
    blogs: (await blogs()).map(publicBlog),
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
