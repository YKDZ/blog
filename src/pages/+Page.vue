<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { computed } from "vue";

import BlogListItem from "@/components/BlogListItem.vue";
import type { PostCardItem } from "@/lib/post";

import type { BlogListItem as BlogListItemData } from "./blog/@slug/types";

const { blogs } = useData<{ blogs: BlogListItemData[] }>();

const formatDate = (time: number) => {
  const [year, month, day] = new Date(time)
    .toISOString()
    .slice(0, 10)
    .split("-");
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
};

const items = computed<PostCardItem[]>(() =>
  blogs.map((blog) => ({
    title: blog.title,
    href: `/blog/${blog.slug}/`,
    description: blog.description,
    time: formatDate(blog.time),
  })),
);
</script>

<template>
  <section class="space-y-5">
    <div class="space-y-4">
      <BlogListItem v-for="item in items" :key="item.href" :item="item" />
    </div>
  </section>
</template>
