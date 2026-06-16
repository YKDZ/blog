<script setup lang="ts">
import { useData } from "vike-vue/useData";

import BlogRenderer from "./BlogRenderer.vue";
import type { BlogPageData } from "./types";

const data = useData<BlogPageData>();
</script>

<template>
  <article class="pb-[50vh]">
    <header class="mb-10 border-b border-(--page-border-soft) pb-8 text-center">
      <h1
        class="text-3xl leading-tight font-semibold tracking-normal sm:text-4xl"
      >
        {{ data.blog.title }}
      </h1>
    </header>
    <BlogRenderer
      :current-slug="data.blog.slug"
      :html="data.html"
      :previews="data.previews"
    />
  </article>
</template>
