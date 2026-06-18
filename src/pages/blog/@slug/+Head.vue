<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { computed } from "vue";

import {
  SITE_DISPLAY_NAME,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_OG_LOCALE,
  SITE_SOCIAL_IMAGE,
  SITE_SOCIAL_IMAGE_HEIGHT,
  SITE_SOCIAL_IMAGE_TYPE,
  SITE_SOCIAL_IMAGE_WIDTH,
} from "@/site";
import { blogPostingStructuredData, jsonLd, siteUrl } from "@/structuredData";

import type { BlogPageData } from "./types";

const data = useData<BlogPageData>();

const markdownUrl = computed(() => {
  return siteUrl(data.blog.markdownPath);
});
const articleUrl = computed(() => {
  return siteUrl(`/blog/${data.blog.slug}/`);
});
const socialImageUrl = computed(() => {
  return siteUrl(SITE_SOCIAL_IMAGE);
});

const articleJsonLd = computed(() => {
  return jsonLd(blogPostingStructuredData(data.blog));
});
</script>

<template>
  <link
    rel="alternate"
    type="text/markdown"
    :hreflang="SITE_LANGUAGE"
    title="Markdown 源文档"
    :href="markdownUrl"
  />
  <meta property="og:type" content="article" />
  <meta property="og:url" :content="articleUrl" />
  <meta property="og:site_name" :content="SITE_NAME" />
  <meta property="og:locale" :content="SITE_OG_LOCALE" />
  <meta property="og:image" :content="socialImageUrl" />
  <meta property="og:image:secure_url" :content="socialImageUrl" />
  <meta property="og:image:type" :content="SITE_SOCIAL_IMAGE_TYPE" />
  <meta property="og:image:width" :content="String(SITE_SOCIAL_IMAGE_WIDTH)" />
  <meta
    property="og:image:height"
    :content="String(SITE_SOCIAL_IMAGE_HEIGHT)"
  />
  <meta property="og:image:alt" :content="SITE_DISPLAY_NAME" />
  <meta
    v-if="data.blog.latestModifiedAt"
    property="article:modified_time"
    :content="data.blog.latestModifiedAt"
  />
  <meta
    property="article:published_time"
    :content="new Date(data.blog.time).toISOString()"
  />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" :content="data.blog.title" />
  <meta name="twitter:description" :content="data.blog.description" />
  <meta name="twitter:image" :content="socialImageUrl" />
  <meta name="twitter:image:alt" :content="SITE_DISPLAY_NAME" />
  <script type="application/ld+json" v-html="articleJsonLd"></script>
</template>
