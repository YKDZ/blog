import type { Plugin } from "vite";

export const blogImagesPlugin = (): Plugin => {
  return {
    name: "vite-plugin-blog-images",
    async buildStart() {
      const { optimizeBlogImages } =
        await import("../pages/blog/@slug/imageAssets");
      await optimizeBlogImages();
    },
    async configureServer() {
      const { optimizeBlogImages } =
        await import("../pages/blog/@slug/imageAssets");
      await optimizeBlogImages();
    },
  };
};
