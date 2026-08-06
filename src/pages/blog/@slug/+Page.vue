<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { computed } from "vue";

import BlogArticleFooter from "@/components/BlogArticleFooter.vue";
import BlogArticleHeader from "@/components/BlogArticleHeader.vue";

import BlogRenderer from "./BlogRenderer.vue";
import { headingIdFromText } from "./plugins/headingId";
import type { BlogPageData } from "./types";

const data = useData<BlogPageData>();
const titleId = computed(() => headingIdFromText(data.blog.title));

const formatDate = (value: string | number) => {
  const [year, month, day] = new Date(value)
    .toISOString()
    .slice(0, 10)
    .split("-");
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
};

const modifiedAtLabel = computed(() => {
  if (!data.blog.latestModifiedAt) return undefined;

  return `修改于 ${formatDate(data.blog.latestModifiedAt)}`;
});
</script>

<template>
  <article class="md:pb-[50vh]">
    <BlogArticleHeader
      :title="data.blog.title"
      :title-id="titleId"
      :time-label="formatDate(data.blog.time)"
    />
    <BlogRenderer
      :current-slug="data.blog.slug"
      :current-title="data.blog.title"
      :html="data.html"
    />
    <BlogArticleFooter
      v-if="data.blog.latestModifiedAt"
      :aria-title="data.blog.title"
      :markdown-href="data.blog.markdownPath"
      :modified-at="modifiedAtLabel"
      :shelf-label="data.babel.shelfLabel"
    />
  </article>
</template>
