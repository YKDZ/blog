<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";

import BlogContent from "./BlogContent.vue";
import type { BlogPreview } from "./types";

const props = defineProps<{
  currentSlug: string;
  html: string;
  previews: BlogPreview[];
}>();

type ActivePreview = BlogPreview & {
  hash: string;
};

const contentEl = ref<HTMLElement>();
const previewBodyEl = ref<HTMLElement>();
const activePreview = ref<ActivePreview>();
const previewLayerReady = ref(false);
const previewLeft = ref(0);
const previewTop = ref(0);

const previewBySlug = computed(() => {
  return new Map(props.previews.map((preview) => [preview.slug, preview]));
});

const previewStyle = computed(() => {
  return {
    left: `${previewLeft.value}px`,
    top: `${previewTop.value}px`,
  };
});

const internalBlogLink = (href: string) => {
  const url = new URL(href, window.location.href);

  if (url.origin !== window.location.origin) return;

  if (url.pathname === window.location.pathname && url.hash) {
    return {
      slug: props.currentSlug,
      hash: decodeURIComponent(url.hash.slice(1)),
    };
  }

  const match = /^\/blog\/([^/]+)\/?$/.exec(url.pathname);

  if (!match?.[1]) return;

  return {
    slug: decodeURIComponent(match[1]),
    hash: url.hash ? decodeURIComponent(url.hash.slice(1)) : "",
  };
};

const previewHasHash = (preview: BlogPreview, hash: string) => {
  if (!hash) return true;

  const template = document.createElement("template");
  template.innerHTML = preview.html;

  return Boolean(
    template.content.querySelector<HTMLElement>(`#${CSS.escape(hash)}`),
  );
};

const previewTargetFromEvent = (event: MouseEvent) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const anchor = target.closest("a");

  if (!anchor || !contentEl.value?.contains(anchor)) return;

  const href = anchor.getAttribute("href");

  if (!href) return;

  const targetBlog = internalBlogLink(href);

  if (!targetBlog) return;

  const preview = previewBySlug.value.get(targetBlog.slug);

  if (!preview) return;

  if (!previewHasHash(preview, targetBlog.hash)) return;

  return {
    ...preview,
    hash: targetBlog.hash,
  };
};

const movePreview = (event: MouseEvent) => {
  const width = Math.min(560, window.innerWidth - 32);
  const gap = 14;
  const viewportPadding = 16;
  const nextLeft = Math.min(
    event.clientX + gap,
    window.innerWidth - width - viewportPadding,
  );

  previewLeft.value = Math.max(viewportPadding, nextLeft);
  previewTop.value = Math.max(viewportPadding, event.clientY + gap);
};

const scrollPreviewToHash = async (hash: string) => {
  await nextTick();

  const body = previewBodyEl.value;

  if (!body) return;

  body.scrollTop = 0;

  if (!hash) return;

  const target = body.querySelector<HTMLElement>(`#${CSS.escape(hash)}`);

  if (!target) return;

  const bodyRect = body.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const centeredTop =
    body.scrollTop +
    targetRect.top -
    bodyRect.top -
    (body.clientHeight - targetRect.height) / 2;
  body.scrollTop = Math.max(0, centeredTop);
};

const onMouseMove = (event: MouseEvent) => {
  const preview = previewTargetFromEvent(event);

  if (!preview) {
    activePreview.value = undefined;
    return;
  }

  movePreview(event);

  if (
    activePreview.value?.slug !== preview.slug ||
    activePreview.value.hash !== preview.hash
  ) {
    activePreview.value = preview;
    void scrollPreviewToHash(preview.hash);
  }
};

const onMouseLeave = () => {
  activePreview.value = undefined;
};

onMounted(() => {
  previewLayerReady.value = true;
});
</script>

<template>
  <div ref="contentEl" @mouseleave="onMouseLeave" @mousemove="onMouseMove">
    <BlogContent :html="props.html" />
  </div>

  <Teleport v-if="previewLayerReady" to="#teleported">
    <aside
      v-if="activePreview"
      class="pointer-events-none fixed z-20 hidden w-140 max-w-[calc(100vw-2rem)] border border-(--page-border-soft) bg-(--page-surface) text-(--page-fg) shadow-none md:block"
      :style="previewStyle"
    >
      <header class="border-b border-(--page-border-soft) px-4 py-3">
        <p class="text-xs font-semibold tracking-normal">
          {{ activePreview.title }}
        </p>
      </header>
      <div
        ref="previewBodyEl"
        class="max-h-96 scroll-pt-12 overflow-hidden px-4 py-3"
      >
        <BlogContent :html="activePreview.html" />
      </div>
    </aside>
  </Teleport>
</template>
