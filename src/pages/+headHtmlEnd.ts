import type { PageContextServer } from "vike/types";

import { inlineStyleHtml } from "../lib/inlineStyle";

/** 渲染期把整份 CSS 内联进 <head>，消除渲染阻塞的样式表请求。 */
export default (_pageContext: PageContextServer): string => inlineStyleHtml();
