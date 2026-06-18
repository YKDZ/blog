<script setup lang="ts">
import { usePageContext } from "vike-vue/usePageContext";
import { computed } from "vue";

import {
  SITE_DESCRIPTION,
  SITE_DISPLAY_NAME,
  SITE_LANGUAGE,
  SITE_NAME,
  SITE_OG_LOCALE,
  SITE_SOCIAL_IMAGE,
  SITE_SOCIAL_IMAGE_HEIGHT,
  SITE_SOCIAL_IMAGE_TYPE,
  SITE_SOCIAL_IMAGE_WIDTH,
} from "@/site";
import { homeStructuredData, jsonLd, siteUrl } from "@/structuredData";

import type { BlogListItem } from "./blog/@slug/types";

type ThemeMode = "light" | "dark" | "auto";

const pageContext = usePageContext();
const canonicalUrl = computed(() => {
  const pathname =
    typeof pageContext.urlPathname === "string" ? pageContext.urlPathname : "/";

  return siteUrl(pathname);
});
const isHomePage = computed(() => pageContext.urlPathname === "/");
const socialImageUrl = computed(() => {
  return siteUrl(SITE_SOCIAL_IMAGE);
});
const homeJsonLd = computed(() => {
  const data = pageContext.data as { blogs?: BlogListItem[] } | undefined;

  if (!isHomePage.value || !data?.blogs) return undefined;

  return jsonLd(homeStructuredData(data.blogs));
});
const llmsUrl = computed(() => {
  return siteUrl("/llms.txt");
});

function initializeTheme() {
  try {
    const key = "blog-theme";
    const saved = localStorage.getItem(key);
    const mode: ThemeMode =
      saved === "light" || saved === "dark" || saved === "auto"
        ? saved
        : "auto";
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const theme =
      mode === "dark" || (mode === "auto" && prefersDark) ? "dark" : "light";

    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.themeMode = "auto";
  }
}

const themeScript = `(${initializeTheme.toString()})();`;
</script>

<template>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="canonical" :href="canonicalUrl" />
  <link
    rel="alternate"
    type="text/markdown"
    :hreflang="SITE_LANGUAGE"
    title="面向大语言模型的站点索引"
    :href="llmsUrl"
  />
  <link
    rel="alternate"
    type="application/atom+xml"
    :title="SITE_NAME"
    href="/atom.xml"
  />
  <meta name="robots" content="index, follow" />
  <template v-if="isHomePage">
    <meta property="og:type" content="website" />
    <meta property="og:url" :content="canonicalUrl" />
    <meta property="og:site_name" :content="SITE_NAME" />
    <meta property="og:locale" :content="SITE_OG_LOCALE" />
    <meta property="og:image" :content="socialImageUrl" />
    <meta property="og:image:secure_url" :content="socialImageUrl" />
    <meta property="og:image:type" :content="SITE_SOCIAL_IMAGE_TYPE" />
    <meta
      property="og:image:width"
      :content="String(SITE_SOCIAL_IMAGE_WIDTH)"
    />
    <meta
      property="og:image:height"
      :content="String(SITE_SOCIAL_IMAGE_HEIGHT)"
    />
    <meta property="og:image:alt" :content="SITE_DISPLAY_NAME" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" :content="SITE_NAME" />
    <meta name="twitter:description" :content="SITE_DESCRIPTION" />
    <meta name="twitter:image" :content="socialImageUrl" />
    <meta name="twitter:image:alt" :content="SITE_DISPLAY_NAME" />
  </template>
  <script
    v-if="homeJsonLd"
    type="application/ld+json"
    v-html="homeJsonLd"
  ></script>
  <script v-html="themeScript"></script>
</template>
