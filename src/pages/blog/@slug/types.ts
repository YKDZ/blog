export type BlogMetadata = {
  time: number;
  slug: string;
  title: string;
  description: string;
  markdownPath: string;
  latestModifiedAt?: string;
};

export type Blog = BlogMetadata & {
  content: string;
};

export type BlogListItem = Omit<BlogMetadata, "markdownPath">;

export type BlogPageData = {
  blog: BlogMetadata;
  html: string;
};

export type BlogPreview = {
  slug: string;
  title: string;
  html: string;
};
