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

const rehypeHeadingId: Plugin = () => {
  return function (tree) {
    const addHeadingIds = (node: HastNode) => {
      if (isElement(node) && headingNames.has(node.tagName)) {
        const id = headingIdFromText(textContent(node));

        if (id) node.properties["id"] = id;
      }

      if (!hasChildren(node)) return;

      for (const child of node.children) addHeadingIds(child);
    };

    addHeadingIds(tree as HastRoot);
  };
};

export default rehypeHeadingId;
