import { blogLibrary } from "../../lib/babel/articles";
import { blogs } from "../blog/@slug/lib";

export const data = async () => {
  const library = await blogLibrary();
  const all = await blogs();

  return {
    charset: [...library.charset],
    minLength: library.minLength,
    maxLength: library.maxLength,
    articles: all.map((blog) => ({
      slug: blog.slug,
      title: blog.title,
      description: blog.description,
      time: blog.time,
      bookNumber: library.textToBookNumber(blog.content).toString(),
    })),
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
