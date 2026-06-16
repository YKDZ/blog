import vikeVue from "vike-vue/config";
import type { Config } from "vike/types";

export default {
  title: "ykdz.me",
  description: "一颗丁子的个人博客",

  prerender: true,
  extends: [vikeVue],
} satisfies Config;
