<script setup lang="ts">
type ThemeMode = "light" | "dark" | "auto";

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
  <script v-html="themeScript"></script>
</template>
