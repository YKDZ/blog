import type { PageContextServer } from "vike/types";

import type { Data } from "./+data.server";

export const description = (ctx: PageContextServer<Data>) => {
  return ctx.data.blog.description;
};
