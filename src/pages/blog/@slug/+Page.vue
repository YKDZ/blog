<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { computed } from "vue";

import BlogRenderer from "./BlogRenderer.vue";
import { headingIdFromText } from "./plugins/headingId";
import type { BlogPageData } from "./types";

const data = useData<BlogPageData>();
const titleId = computed(() => headingIdFromText(data.blog.title));

const formatDate = (value: string) => {
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
      <h1
        :id="titleId"
        class="scroll-mt-[calc(var(--site-header-height)+0.5rem)] text-3xl leading-tight font-semibold tracking-normal sm:text-4xl"
      >
        {{ data.blog.title }}
      </h1>
    </header>
    <BlogRenderer
      :current-slug="data.blog.slug"
      :html="data.html"
      :previews="data.previews"
    />
    <footer
      v-if="data.blog.latestModifiedAt"
      class="mt-12 pt-5 text-xs text-(--page-muted)"
    >
      修改于
      <time :datetime="data.blog.latestModifiedAt">
        {{ formatDate(data.blog.latestModifiedAt) }}
      </time>
    </footer>
  </article>
</template>
