<script setup lang="ts">
defineProps<{
  title: string;
  titleId?: string;
  /** 已格式化的日期文本，例如“2026 年 8 月 5 日”。 */
  timeLabel?: string;
}>();
</script>

<template>
  <header
    class="mx-auto mb-10 max-w-2xl border-b border-(--page-border-soft) pb-8 text-center"
  >
    <time
      v-if="timeLabel"
      class="mb-3 block text-xs leading-6 text-(--page-fg-muted)"
    >
      {{ timeLabel }}
    </time>
    <h1
      :id="titleId"
      class="scroll-mt-[calc(var(--site-header-height)+0.5rem)] text-3xl leading-snug font-semibold tracking-normal text-balance sm:text-4xl"
    >
      {{ title }}
    </h1>
  </header>
</template>
