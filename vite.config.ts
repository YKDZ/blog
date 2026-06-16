import { resolve } from "path";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import vike from "vike/plugin";
import { defineConfig } from "vite";

import { optimizeBlogImages } from "./src/pages/blog/@slug/imageAssets";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve("src"),
    },
  },
  plugins: [
    {
      name: "blog-images",
      async buildStart() {
        await optimizeBlogImages();
      },
      async configureServer() {
        await optimizeBlogImages();
      },
    },
    vike(),
    vue(),
    tailwindcss(),
  ],
});
