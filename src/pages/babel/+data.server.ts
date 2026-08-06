import { blogLibrary } from "../../lib/babel/articles";

export const data = async () => {
  const library = await blogLibrary();

  return {
    charset: [...library.charset],
    minLength: library.minLength,
    maxLength: library.maxLength,
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
