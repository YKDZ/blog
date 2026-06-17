import { blogUrl } from "./pages/blog/@slug/lib";
import type { Blog } from "./pages/blog/@slug/types";
import {
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_ORIGIN,
} from "./site";

type JsonLdValue =
  | boolean
  | number
  | string
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JsonLdObject = { [key: string]: JsonLdValue };

export const siteUrl = (pathname = "/") => {
  return new URL(pathname, SITE_ORIGIN).href;
};

const personStructuredData = () => {
  return {
    "@type": "Person",
    "@id": siteUrl("/#author"),
    name: SITE_AUTHOR,
    url: SITE_ORIGIN,
  } satisfies JsonLdObject;
};

const websiteStructuredData = () => {
  return {
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: siteUrl("/"),
    inLanguage: SITE_LANGUAGE,
    publisher: personStructuredData(),
  } satisfies JsonLdObject;
};

const blogStructuredData = (blogs: Blog[]) => {
  return {
    "@type": "Blog",
    "@id": siteUrl("/#blog"),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: siteUrl("/"),
    inLanguage: SITE_LANGUAGE,
    author: personStructuredData(),
    isPartOf: {
      "@id": siteUrl("/#website"),
    },
    blogPost: blogs.map((blog) => ({
      "@type": "BlogPosting",
      "@id": siteUrl(`${blogUrl(blog.slug)}#blogposting`),
      headline: blog.title,
      url: siteUrl(blogUrl(blog.slug)),
      datePublished: new Date(blog.time).toISOString(),
      dateModified: blog.latestModifiedAt ?? new Date(blog.time).toISOString(),
      description: blog.description,
    })),
  } satisfies JsonLdObject;
};

export const homeStructuredData = (blogs: Blog[]) => {
  return {
    "@context": "https://schema.org",
    "@graph": [
      personStructuredData(),
      websiteStructuredData(),
      blogStructuredData(blogs),
    ],
  } satisfies JsonLdObject;
};

export const blogPostingStructuredData = (blog: Blog) => {
  const url = siteUrl(blogUrl(blog.slug));

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#blogposting`,
    headline: blog.title,
    description: blog.description,
    datePublished: new Date(blog.time).toISOString(),
    dateModified: blog.latestModifiedAt ?? new Date(blog.time).toISOString(),
    author: personStructuredData(),
    publisher: personStructuredData(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    url,
    inLanguage: SITE_LANGUAGE,
    isPartOf: {
      "@id": siteUrl("/#blog"),
    },
  } satisfies JsonLdObject;
};

export const jsonLd = (value: JsonLdObject) => {
  return JSON.stringify(value);
};
