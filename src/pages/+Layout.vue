<script setup lang="ts">
import "@/assets/style.css";
import { onBeforeUnmount, onMounted, ref } from "vue";

type ThemeMode = "light" | "dark" | "auto";

const themeModes = [
  { label: "浅", value: "light" },
  { label: "深", value: "dark" },
  { label: "自", value: "auto" },
] as const satisfies ReadonlyArray<{
  label: string;
  value: ThemeMode;
}>;

const storageKey = "blog-theme";
const mode = ref<ThemeMode>("auto");
const mounted = ref(false);

let mediaQuery: MediaQueryList | undefined;

const applyTheme = (nextMode: ThemeMode) => {
  const prefersDark = mediaQuery?.matches ?? false;
  const theme =
    nextMode === "dark" || (nextMode === "auto" && prefersDark)
      ? "dark"
      : "light";

  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themeMode = nextMode;
  document.documentElement.style.colorScheme = theme;
};

const setMode = (nextMode: ThemeMode) => {
  mode.value = nextMode;
  localStorage.setItem(storageKey, nextMode);
  applyTheme(nextMode);
};

const onSystemThemeChange = () => {
  if (mode.value === "auto") applyTheme("auto");
};

onMounted(() => {
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const storedMode = localStorage.getItem(storageKey);
  if (
    storedMode === "light" ||
    storedMode === "dark" ||
    storedMode === "auto"
  ) {
    mode.value = storedMode;
  } else {
    mode.value =
      document.documentElement.dataset.themeMode === "light" ||
      document.documentElement.dataset.themeMode === "dark"
        ? document.documentElement.dataset.themeMode
        : "auto";
  }

  applyTheme(mode.value);
  mounted.value = true;
  mediaQuery.addEventListener("change", onSystemThemeChange);
});

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener("change", onSystemThemeChange);
});
</script>

<template>
  <div class="min-h-screen bg-(--page-bg) text-(--page-fg)">
    <header class="sticky top-0 z-10 h-(--site-header-height) bg-(--page-bg)">
      <div
        class="mx-auto flex h-full max-w-3xl items-center justify-between px-5"
      >
        <a
          href="/"
          class="text-sm font-semibold tracking-normal text-(--page-fg)"
        >
          一颗丁子
        </a>
        <div
          class="flex border border-(--page-border-soft) bg-(--page-surface) transition-colors duration-200 hover:border-(--page-border-hover)"
        >
          <button
            v-for="themeMode in themeModes"
            :key="themeMode.value"
            type="button"
            class="theme-option h-7 min-w-7 border-r border-(--page-border-soft) px-2 text-xs transition-colors duration-200 last:border-r-0 hover:border-(--page-border-hover) focus-visible:border-(--page-border-hover)"
            :data-theme-option="themeMode.value"
            :aria-pressed="mounted ? mode === themeMode.value : undefined"
            @click="setMode(themeMode.value)"
          >
            {{ themeMode.label }}
          </button>
        </div>
      </div>
    </header>
    <main class="mx-auto w-full max-w-3xl px-5 py-8 sm:py-10">
      <slot />
    </main>
  </div>
</template>
