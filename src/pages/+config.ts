import vikeVue from "vike-vue/config";
import type { Config } from "vike/types";

const themeScript = `(() => {
  try {
    const key = "blog-theme";
    const saved = localStorage.getItem(key);
    const mode = saved === "light" || saved === "dark" || saved === "auto" ? saved : "auto";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = mode === "dark" || (mode === "auto" && prefersDark) ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.themeMode = "auto";
  }
})();`;

export default {
  prerender: true,
  headHtmlBegin: `<link rel="icon" type="image/svg+xml" href="/favicon.svg"><script>${themeScript}</script>`,
  extends: [vikeVue],
} satisfies Config;
