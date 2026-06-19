<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { computed } from "vue";

import { SITE_LANGUAGE } from "@/site.ts";

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
</script>

<template>
  <article class="md:pb-[50vh]">
    <header class="mb-10 border-b border-(--page-border-soft) pb-8 text-center">
      <time
        class="mb-3 block text-xs leading-6 text-(--page-fg-muted)"
        :datetime="new Date(data.blog.time).toISOString()"
      >
        {{ formatDate(data.blog.time) }}
      </time>
      <h1
        :id="titleId"
        class="scroll-mt-[calc(var(--site-header-height)+0.5rem)] text-3xl leading-tight font-semibold tracking-normal sm:text-4xl"
      >
        {{ data.blog.title }}
      </h1>
    </header>
    <BlogRenderer
      :current-slug="data.blog.slug"
      :current-title="data.blog.title"
      :html="data.html"
    />
    <footer
      v-if="data.blog.latestModifiedAt"
      class="mt-12 flex justify-between pt-5 text-xs text-(--page-fg-muted)"
    >
      <span>
        修改于
        <time :datetime="data.blog.latestModifiedAt">
          {{ formatDate(data.blog.latestModifiedAt) }}
        </time></span
      ><a
        :aria-label="`查看《${data.blog.title}》的 Markdown 原文`"
        :hreflang="SITE_LANGUAGE"
        :href="data.blog.markdownPath"
        data-markdown-source-link
        rel="alternate"
        type="text/markdown"
        >Markdown 原文</a
      >
    </footer>
  </article>
</template>
