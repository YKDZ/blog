<script setup lang="ts">
import { useData } from "vike-vue/useData";

import type { BlogListItem } from "./blog/@slug/types";

const { blogs } = useData<{ blogs: BlogListItem[] }>();

const formatDate = (time: number) => {
  const [year, month, day] = new Date(time)
    .toISOString()
    .slice(0, 10)
    .split("-");
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
};
</script>

<template>
  <section class="space-y-5">
    <div class="space-y-4">
      <article
        v-for="blog in blogs"
        :key="blog.slug"
        class="border border-(--page-border-soft) bg-(--page-surface) transition-colors duration-200 hover:border-(--page-border-hover)"
      >
        <a :href="`/blog/${blog.slug}/`" class="block px-5 py-4">
          <time class="block text-xs font-normal text-(--page-fg)">
            {{ formatDate(blog.time) }}
          </time>
          <h2
            class="mt-2 text-xl font-semibold tracking-normal text-(--page-fg)"
          >
            {{ blog.title }}
          </h2>
          <p
            class="mt-2 truncate text-sm leading-6 text-(--page-fg-muted)"
            :title="blog.description"
          >
            {{ blog.description }}
          </p>
        </a>
      </article>
    </div>
  </section>
</template>
