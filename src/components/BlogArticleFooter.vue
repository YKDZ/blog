<script setup lang="ts">
import { computed } from "vue";

import type { DisplayableBookLocation } from "@/lib/babel/display";
import { formatBookLocation } from "@/lib/babel/display";
import { SITE_LANGUAGE } from "@/site";

const props = defineProps<{
  markdownHref: string;
  /** 用于 Markdown 原文链接的无障碍描述（如文章标题） */
  ariaTitle?: string;
  /** 书架号链接（跳转到巴别图书馆并预填充书架号） */
  babelLocation: DisplayableBookLocation;
  /** 修改于文本 */
  modifiedAt?: string;
  markdownTarget?: string;
}>();

/** 跳转到巴别图书馆并预填书架号的链接。 */
const shelfHref = computed(() => {
  const { hexagon, wall, shelfOnWall, volume } = props.babelLocation;

  return (
    `/babel/?hexagon=${encodeURIComponent(String(hexagon))}` +
    `&wall=${wall}&shelf=${shelfOnWall}&volume=${volume}`
  );
});

const shelfLabel = computed(() =>
  formatBookLocation(props.babelLocation, { truncateHexagon: true }),
);

const markdownTitle = computed(
  () => `查看《${props.ariaTitle}》的 Markdown 原文`,
);
</script>

<template>
  <footer class="mx-auto mt-12 pt-5 text-xs text-(--page-fg-muted)">
    <div class="flex justify-between">
      <span>{{ shelfLabel }}</span>
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
