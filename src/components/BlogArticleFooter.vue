<script setup lang="ts">
import { computed } from "vue";

import { SITE_LANGUAGE } from "@/site";

const props = defineProps<{
  markdownHref: string;
  /** 用于 Markdown 原文链接的无障碍描述（如文章标题） */
  ariaTitle?: string;
  /** 截断后的书架号，例如 abcd...wxyz-w1-s1-v1。 */
  shelfLabel: string;
  /** 修改于文本 */
  modifiedAt?: string;
  markdownTarget?: string;
}>();

const markdownTitle = computed(
  () => `查看《${props.ariaTitle}》的 Markdown 原文`,
);
</script>

<template>
  <footer class="mx-auto mt-12 pt-5 text-xs text-(--page-fg-muted)">
    <div class="flex justify-between">
      <span>{{ props.shelfLabel }}</span>
      <div class="flex flex-col gap-2 text-right">
        <a
          :aria-label="markdownTitle"
          :title="markdownTitle"
          :hreflang="SITE_LANGUAGE"
          :href="markdownHref"
          :target="markdownTarget"
          data-markdown-source-link
          rel="alternate noopener"
          type="text/markdown"
          >{{ "Markdown 原文" }}</a
        >
        <span v-if="modifiedAt">{{ modifiedAt }}</span>
      </div>
    </div>
  </footer>
</template>
