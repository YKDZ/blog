type TrustedTypesPolicy = {
  createHTML(value: string): unknown;
};

type TrustedTypesPolicyFactory = {
  createPolicy(
    name: string,
    options: {
      createHTML(value: string): string;
    },
  ): TrustedTypesPolicy;
};

const trustedTypesFactory = () => {
  if (typeof window === "undefined") return undefined;

  return (
    window as typeof window & { trustedTypes?: TrustedTypesPolicyFactory }
  ).trustedTypes;
};

let blogHtmlPolicy: TrustedTypesPolicy | undefined;

const trustedBlogHtml = (html: string) => {
  const trustedTypes = trustedTypesFactory();

  if (!trustedTypes) return html;

  blogHtmlPolicy ??= trustedTypes.createPolicy("blog-html", {
    createHTML(value) {
      return value;
    },
  });

  return blogHtmlPolicy.createHTML(html);
};

export const setTrustedBlogHtml = (element: Element, html: string) => {
  element.innerHTML = trustedBlogHtml(html) as string;
};
