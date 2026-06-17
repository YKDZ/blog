import type { Plugin } from "unified";

const headingNames = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

type HastNode = HastElement | HastRoot | HastText | { type: string };

type HastRoot = {
  type: "root";
  children: HastNode[];
};

type HastText = {
  type: "text";
  value: string;
};

type HastElement = {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: HastNode[];
};

const isElement = (node: HastNode): node is HastElement => {
  return node.type === "element";
};

const isText = (node: HastNode): node is HastText => {
  return node.type === "text";
};

const hasChildren = (node: HastNode): node is HastElement | HastRoot => {
  return "children" in node && Array.isArray(node.children);
};

const textContent = (node: HastElement): string => {
  return node.children
    .map((child) => {
      if (isText(child)) return child.value;
      if (isElement(child)) return textContent(child);
      return "";
    })
    .join("");
};

export const headingIdFromText = (text: string): string => {
  return text.trim().toLowerCase().replace(/\s+/g, "-");
};

const classNames = (value: unknown): string[] => {
  if (typeof value === "string") return value.split(/\s+/);
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
};

const shouldShowHeadingAnchor = (node: HastElement) => {
  return !classNames(node.properties["className"]).includes("sr-only");
};

const hideAssistiveHeading = (node: HastElement) => {
  if (!classNames(node.properties["className"]).includes("sr-only")) return;

  node.properties["aria-hidden"] = "true";
  node.properties["hidden"] = true;
};

const rehypeHeadingId: Plugin = () => {
  return function (tree) {
    const addHeadingIds = (node: HastNode) => {
      if (isElement(node) && headingNames.has(node.tagName)) {
        const id = headingIdFromText(textContent(node));

        if (id) {
          node.properties["id"] = id;
          hideAssistiveHeading(node);
          if (shouldShowHeadingAnchor(node)) {
            node.children.push({
              type: "element",
              tagName: "a",
              properties: {
                "aria-label": "复制此章节链接",
                "aria-hidden": "true",
                className: ["heading-anchor"],
                "data-heading-anchor": "",
                href: `#${id}`,
                tabIndex: -1,
              },
              children: [],
            });
          }
        }
      }

      if (!hasChildren(node)) return;

      for (const child of node.children) addHeadingIds(child);
    };

    addHeadingIds(tree as HastRoot);
  };
};

export default rehypeHeadingId;
