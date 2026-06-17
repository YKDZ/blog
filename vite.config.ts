import { resolve } from "path";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import vike from "vike/plugin";
import { defineConfig } from "vite";

import { blogImagesPlugin } from "./src/vite-plugins/blogImages";
import { siteMetadataPlugin } from "./src/vite-plugins/siteMetadata";

const isVueUseInvalidAnnotation = (log: unknown) => {
  if (!log || typeof log !== "object") return false;

  const { code, id } = log as { code?: unknown; id?: unknown };

  return (
    code === "INVALID_ANNOTATION" &&
    typeof id === "string" &&
    id.includes("/@vueuse/core/")
  );
};

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve("src"),
    },
  },
  build: {
    rolldownOptions: {
      onLog(level, log, defaultHandler) {
        if (isVueUseInvalidAnnotation(log)) return;

        defaultHandler(level, log);
      },
    },
  },
  plugins: [
    blogImagesPlugin(),
    siteMetadataPlugin(),
    vike(),
    vue(),
    tailwindcss(),
  ],
});
