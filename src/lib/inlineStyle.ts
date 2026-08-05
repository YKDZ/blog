import styleCss from "../assets/style.css?inline";

/** 构建/SSR 时把整份 CSS 内联进 <head>，消除渲染阻塞的样式表请求。 */
export const inlineStyleHtml = (): string => {
  return `<style>${styleCss}</style>`;
};
