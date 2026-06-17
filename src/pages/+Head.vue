<script setup lang="ts">
import { usePageContext } from "vike-vue/usePageContext";
import { computed } from "vue";

import { SITE_NAME } from "@/site";
import { homeStructuredData, jsonLd, siteUrl } from "@/structuredData";

import type { Blog } from "./blog/@slug/types";

type ThemeMode = "light" | "dark" | "auto";

const pageContext = usePageContext();
const canonicalUrl = computed(() => {
  const pathname =
    typeof pageContext.urlPathname === "string" ? pageContext.urlPathname : "/";

  return siteUrl(pathname);
});
const homeJsonLd = computed(() => {
  const data = pageContext.data as { blogs?: Blog[] } | undefined;

  if (pageContext.urlPathname !== "/" || !data?.blogs) return undefined;

  return jsonLd(homeStructuredData(data.blogs));
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
const clarityScript = `(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "x8af8llwcw");`;
</script>

<template>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="canonical" :href="canonicalUrl" />
  <link
    rel="alternate"
    type="text/markdown"
    title="LLM-readable site index"
    href="/llms.txt"
  />
  <link
    rel="alternate"
    type="application/atom+xml"
    :title="SITE_NAME"
    href="/atom.xml"
  />
  <meta name="robots" content="index, follow" />
  <script type="text/javascript" v-html="clarityScript"></script>
  <script
    v-if="homeJsonLd"
    type="application/ld+json"
    v-html="homeJsonLd"
  ></script>
  <script v-html="themeScript"></script>
</template>
