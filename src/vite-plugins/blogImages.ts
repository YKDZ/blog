import type { Plugin } from "vite";

let optimizeBlogImagesPromise: Promise<void> | undefined;

const optimizeBlogImagesOnce = () => {
  optimizeBlogImagesPromise ??= import("../pages/blog/@slug/imageAssets").then(
    ({ optimizeBlogImages }) => optimizeBlogImages(),
  );

  return optimizeBlogImagesPromise;
};

export const blogImagesPlugin = (): Plugin => {
  return {
    name: "vite-plugin-blog-images",
    async buildStart() {
      await optimizeBlogImagesOnce();
    },
    async configureServer() {
      await optimizeBlogImagesOnce();
    },
  };
};
