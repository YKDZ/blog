import { resolve } from "path";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import vike from "vike/plugin";
import { defineConfig } from "vite";

import { blogImagesPlugin } from "./src/vite-plugins/blogImages";
import { siteMetadataPlugin } from "./src/vite-plugins/siteMetadata";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve("src"),
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
