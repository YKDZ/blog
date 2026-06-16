<script setup lang="ts">
import { useData } from "vike-vue/useData";

import type { Blog } from "./blog/@slug/types";

const { blogs } = useData<{ blogs: Blog[] }>();

const formatDate = (time: number) => {
  return new Date(time).toISOString().slice(0, 10);
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
        <a :href="`/blog/${blog.slug}`" class="block px-5 py-4">
          <time class="block text-xs font-normal text-[var(--page-fg)]">
            {{ formatDate(blog.time) }}
          </time>
          <h2
            class="mt-2 text-xl font-semibold tracking-normal text-[var(--page-fg)]"
          >
            {{ blog.title }}
          </h2>
        </a>
      </article>
    </div>
  </section>
</template>
