<script setup lang="ts">
import type { PostCardItem } from "@/lib/post";

const props = defineProps<{
  item: PostCardItem;
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<template>
  <article
    class="border border-(--page-border-soft) bg-(--page-surface) transition-colors duration-200 hover:border-(--page-border-hover)"
  >
    <a
      :href="props.item.href"
      class="block px-5 py-4"
      @click="emit('click', $event)"
    >
      <time
        v-if="props.item.time"
        class="block text-xs font-normal text-(--page-fg)"
      >
        {{ props.item.time }}
      </time>
      <h2 class="mt-2 text-xl font-semibold tracking-normal text-(--page-fg)">
        {{ props.item.title }}
      </h2>
      <p
        v-if="props.item.description"
        class="mt-2 truncate text-sm leading-6 text-(--page-fg-muted)"
        :title="props.item.description"
      >
        {{ props.item.description }}
      </p>
    </a>
  </article>
</template>
