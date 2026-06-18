<script setup lang="ts">
import { useClipboard, useEventListener } from "@vueuse/core";
import { computed, nextTick, onMounted, ref } from "vue";

import BlogContent from "./BlogContent.vue";
import { headingIdFromText } from "./plugins/headingId";
import type { BlogPreview } from "./types";

const props = defineProps<{
  currentSlug: string;
  currentTitle: string;
  html: string;
}>();

type ActivePreview = BlogPreview & {
  hash: string;
};

type PreviewTarget = {
  slug: string;
  hash: string;
};

const contentEl = ref<HTMLElement>();
const previewBodyEl = ref<HTMLElement>();
const activePreview = ref<ActivePreview>();
const previewLayerReady = ref(false);
const previewLeft = ref(0);
const previewTop = ref(0);
const previewRequestId = ref(0);
const { copy: copyToClipboard } = useClipboard({ legacy: true });

const currentPreview = computed<BlogPreview>(() => {
  return {
    slug: props.currentSlug,
    title: props.currentTitle,
    html: props.html,
  };
});

const previewCache = new Map<string, Promise<BlogPreview | undefined>>();

const previewStyle = computed(() => {
  return {
    left: `${previewLeft.value}px`,
    top: `${previewTop.value}px`,
  };
});

const activePreviewTargetsTitle = computed(() => {
  if (!activePreview.value?.hash) return false;

  return (
    activePreview.value.hash === headingIdFromText(activePreview.value.title)
  );
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

const isBlogPreview = (value: unknown): value is BlogPreview => {
  if (!value || typeof value !== "object") return false;

  const preview = value as Partial<Record<keyof BlogPreview, unknown>>;

  return (
    typeof preview.slug === "string" &&
    typeof preview.title === "string" &&
    typeof preview.html === "string"
  );
};

const previewJsonUrl = (target: PreviewTarget) => {
  const fileName = target.hash
    ? `${encodeURIComponent(target.hash)}.json`
    : "index.json";

  return `/blog-previews/${encodeURIComponent(target.slug)}/${fileName}`;
};

const loadPreview = async (target: PreviewTarget) => {
  if (target.slug === props.currentSlug) return currentPreview.value;

  const cacheKey = `${target.slug}#${target.hash}`;

  if (!previewCache.has(cacheKey)) {
    previewCache.set(
      cacheKey,
      fetch(previewJsonUrl(target))
        .then(async (response) => {
          if (!response.ok) return undefined;

          const preview: unknown = await response.json();

          return isBlogPreview(preview) ? preview : undefined;
        })
        .catch(() => undefined),
    );
  }

  return previewCache.get(cacheKey);
};

const previewHasHash = (preview: BlogPreview, hash: string) => {
  if (!hash) return true;

  if (hash === headingIdFromText(preview.title)) return true;

  const template = document.createElement("template");
  template.innerHTML = preview.html;

  return Boolean(
    template.content.querySelector<HTMLElement>(`#${CSS.escape(hash)}`),
  );
};

const previewTargetFromEvent = (
  event: MouseEvent,
): PreviewTarget | undefined => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const anchor = target.closest("a");

  if (!anchor || !contentEl.value?.contains(anchor)) return;
  if (anchor.hasAttribute("data-heading-anchor")) return;

  const href = anchor.getAttribute("href");

  if (!href) return;

  const targetBlog = internalBlogLink(href);

  if (!targetBlog) return;

  return targetBlog;
};

const movePreview = (event: MouseEvent) => {
  const width = Math.min(560, window.innerWidth - 32);
  const height = Math.min(448, window.innerHeight - 32);
  const gap = 14;
  const viewportPadding = 16;
  const nextLeft = Math.min(
    event.clientX + gap,
    window.innerWidth - width - viewportPadding,
  );
  const belowTop = event.clientY + gap;
  const aboveTop = event.clientY - gap - height;
  const nextTop = window.innerHeight - belowTop >= height ? belowTop : aboveTop;

  previewLeft.value = Math.max(viewportPadding, nextLeft);
  previewTop.value = Math.min(
    Math.max(viewportPadding, nextTop),
    window.innerHeight - height - viewportPadding,
  );
};

const clearPreviewHighlight = () => {
  previewBodyEl.value
    ?.querySelector<HTMLElement>("[data-preview-target]")
    ?.removeAttribute("data-preview-target");
};

const resetHeadingAnchor = (anchor: HTMLAnchorElement) => {
  delete anchor.dataset.copied;
};

const markHeadingAnchorCopied = (anchor: HTMLAnchorElement) => {
  anchor.dataset.copied = "true";

  useEventListener(anchor, "mouseleave", () => resetHeadingAnchor(anchor), {
    once: true,
  });
  useEventListener(anchor, "blur", () => resetHeadingAnchor(anchor), {
    once: true,
  });
};

const copyHeadingUrl = async (anchor: HTMLAnchorElement) => {
  const href = anchor.getAttribute("href");

  if (!href) return false;

  const url = new URL(href, window.location.href);

  try {
    await copyToClipboard(url.href);
    markHeadingAnchorCopied(anchor);
    return true;
  } catch {
    return false;
  }
};

const scrollPreviewToHash = async (hash: string) => {
  await nextTick();

  const body = previewBodyEl.value;

  if (!body) return;

  body.scrollTop = 0;
  clearPreviewHighlight();

  if (!hash) return;

  if (hash === headingIdFromText(activePreview.value?.title ?? "")) return;

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
  target.dataset.previewTarget = "true";
};

const onMouseMove = (event: MouseEvent) => {
  const targetBlog = previewTargetFromEvent(event);

  if (!targetBlog) {
    previewRequestId.value += 1;
    activePreview.value = undefined;
    return;
  }

  movePreview(event);

  const requestId = previewRequestId.value + 1;
  previewRequestId.value = requestId;

  void loadPreview(targetBlog).then((preview) => {
    if (requestId !== previewRequestId.value) return;

    if (!preview || !previewHasHash(preview, targetBlog.hash)) {
      activePreview.value = undefined;
      return;
    }

    const html = preview.html;
    if (!html) {
      activePreview.value = undefined;
      return;
    }

    const active = {
      ...preview,
      html,
      hash: targetBlog.hash,
    };

    if (
      activePreview.value?.slug !== active.slug ||
      activePreview.value.hash !== active.hash
    ) {
      activePreview.value = active;
      void scrollPreviewToHash(active.hash);
    }
  });
};

const onMouseLeave = () => {
  previewRequestId.value += 1;
  activePreview.value = undefined;
};

const onClick = (event: MouseEvent) => {
  const target = event.target;

  if (target instanceof Element) {
    const headingAnchor = target.closest<HTMLAnchorElement>(
      "a[data-heading-anchor]",
    );

    if (headingAnchor && contentEl.value?.contains(headingAnchor)) {
      event.preventDefault();

      void copyHeadingUrl(headingAnchor).then((copied) => {
        if (!copied) window.location.href = headingAnchor.href;
      });
    }
  }

  activePreview.value = undefined;
  previewRequestId.value += 1;
};

onMounted(() => {
  previewLayerReady.value = true;
});
</script>

<template>
  <div
    ref="contentEl"
    @click="onClick"
    @mouseleave="onMouseLeave"
    @mousemove="onMouseMove"
  >
    <BlogContent :html="props.html" />
  </div>

  <Teleport v-if="previewLayerReady" to="#teleported">
    <aside
      v-if="activePreview"
      class="pointer-events-none fixed z-20 hidden w-140 max-w-[calc(100vw-2rem)] border border-(--page-border-soft) bg-(--page-surface) text-(--page-fg) shadow-none md:block"
      :style="previewStyle"
    >
      <header class="border-b border-(--page-border-soft) px-4 py-3">
        <p
          class="text-xs font-semibold tracking-normal"
          :data-preview-target="activePreviewTargetsTitle ? 'true' : undefined"
        >
          {{ activePreview.title }}
        </p>
      </header>
      <div
        ref="previewBodyEl"
        class="max-h-96 scroll-pt-(--site-header-height) overflow-hidden px-4 py-3"
      >
        <BlogContent :html="activePreview.html" />
      </div>
    </aside>
  </Teleport>
</template>
