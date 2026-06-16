export type Blog = {
  time: number;
  slug: string;
  title: string;
  content: string;
};

export type BlogPageData = {
  blog: Blog;
  html: string;
  previews: BlogPreview[];
};

export type BlogPreview = {
  slug: string;
  title: string;
  html: string;
};
