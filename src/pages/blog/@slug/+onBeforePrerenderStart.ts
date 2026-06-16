import { blogs } from "./lib";

export const onBeforePrerenderStart = async (): Promise<string[]> => {
  return (await blogs()).map((blog) => `/blog/${blog.slug}`);
};
