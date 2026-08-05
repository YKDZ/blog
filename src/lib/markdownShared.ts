import type { Root, RootContent } from "mdast";
import { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import type { Plugin } from "unified";

export const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.["a"] ?? []),
      ["target", "_blank"],
      ["rel", "noopener", "noreferrer"],
    ],
    img: [
      ...(defaultSchema.attributes?.["img"] ?? []),
      "height",
      "loading",
      "sizes",
      "srcset",
      "srcSet",
      "width",
    ],
  },
  clobberPrefix: "",
};

export const remarkRemoveFirstHeading: Plugin<[], Root> = () => {
  return function (tree) {
    const index = tree.children.findIndex((child) => child.type === "heading");

    if (index !== -1) tree.children.splice(index, 1);
  };
};

export const textContent = (node: RootContent): string => {
  if ("value" in node && typeof node.value === "string") return node.value;
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.map(textContent).join("");
  }

  return "";
};
