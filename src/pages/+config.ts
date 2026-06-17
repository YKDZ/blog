import vikeVue from "vike-vue/config";
import type { Config } from "vike/types";

import { SITE_DESCRIPTION, SITE_NAME } from "../site";

export default {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,

  prerender: true,
  extends: [vikeVue],
} satisfies Config;
