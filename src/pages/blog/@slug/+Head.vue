<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { computed } from "vue";

import { SITE_NAME, SITE_ORIGIN } from "@/site";

import type { BlogPageData } from "./types";

const data = useData<BlogPageData>();

const articleUrl = computed(() => {
  return new URL(`/blog/${data.blog.slug}/`, SITE_ORIGIN).href;
});

const markdownUrl = computed(() => {
  return new URL(data.blog.markdownPath, SITE_ORIGIN).href;
});

const jsonLd = computed(() => {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: data.blog.title,
    datePublished: new Date(data.blog.time).toISOString(),
    dateModified:
      data.blog.latestModifiedAt ?? new Date(data.blog.time).toISOString(),
    author: {
      "@type": "Person",
      name: "YKDZ",
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl.value,
    },
    url: articleUrl.value,
    isPartOf: {
      "@type": "Blog",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  });
});
</script>

<template>
  <link
    rel="alternate"
    type="text/markdown"
    title="Markdown source"
    :href="markdownUrl"
  />
  <script type="application/ld+json" v-html="jsonLd"></script>
</template>
