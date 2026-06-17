export const normalizeMarkdownResourceUrls = (content: string): string => {
  return content.replace(
    /(!?\[[^\]\n]*\]\()([^)<> \t\n][^)\n]*?)(\s+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?(\))/g,
    (
      match,
      open: string,
      url: string,
      title: string | undefined,
      close: string,
    ) => {
      if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith("#")) {
        return match;
      }

      return `${open}${url.trimEnd().replace(/\s+/g, "%20")}${title ?? ""}${close}`;
    },
  );
};
