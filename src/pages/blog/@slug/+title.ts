import type { PageContextServer } from "vike/types";

import type { Data } from "./+data.server";

export const title = (ctx: PageContextServer<Data>) => {
  return ctx.data.blog.title;
};
