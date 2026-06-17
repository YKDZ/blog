<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { computed } from "vue";

import { blogPostingStructuredData, jsonLd, siteUrl } from "@/structuredData";

import type { BlogPageData } from "./types";

const data = useData<BlogPageData>();

const markdownUrl = computed(() => {
  return siteUrl(data.blog.markdownPath);
});

const articleJsonLd = computed(() => {
  return jsonLd(blogPostingStructuredData(data.blog));
});
</script>

<template>
  <link
    rel="alternate"
    type="text/markdown"
    title="Markdown source"
    :href="markdownUrl"
  />
  <script type="application/ld+json" v-html="articleJsonLd"></script>
</template>
