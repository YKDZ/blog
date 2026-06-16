<script setup lang="ts">
const props = defineProps<{
  html: string;
}>();
</script>

<template>
  <div
    class="prose md:prose-lg max-w-none text-(--page-fg) [--tw-prose-body:var(--page-fg)] [--tw-prose-bold:var(--page-fg)] [--tw-prose-bullets:var(--page-fg)] [--tw-prose-captions:var(--page-fg)] [--tw-prose-code:var(--page-fg)] [--tw-prose-counters:var(--page-fg)] [--tw-prose-headings:var(--page-fg)] [--tw-prose-hr:var(--page-border-soft)] [--tw-prose-kbd:var(--page-fg)] [--tw-prose-links:var(--page-fg)] [--tw-prose-pre-bg:#0d1117] [--tw-prose-pre-code:#e6edf3] [--tw-prose-quote-borders:var(--page-border-soft)] [--tw-prose-quotes:var(--page-fg)] [--tw-prose-td-borders:var(--page-border-soft)] [--tw-prose-th-borders:var(--page-border-soft)] [&_h1]:scroll-mt-16 [&_h2]:scroll-mt-16 [&_h3]:scroll-mt-16 [&_h4]:scroll-mt-16 [&_h5]:scroll-mt-16 [&_h6]:scroll-mt-16 [&_img]:border [&_img]:border-(--page-border-soft)"
    v-html="props.html"
  ></div>
</template>
