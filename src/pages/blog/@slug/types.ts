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
  babel: BlogBabelInfo;
};

export type BlogBabelInfo = {
  location: {
    hexagon: string;
    wall: number;
    shelfOnWall: number;
    volume: number;
  };
};

export type BlogPreview = {
  slug: string;
  title: string;
  html: string;
};
