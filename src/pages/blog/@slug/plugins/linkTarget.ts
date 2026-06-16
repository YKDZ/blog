import type { Element, Root } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const EXTERNAL_URL = /^(https?:)?\/\//i;

const isExternalUrl = (href: unknown): href is string => {
  return typeof href === "string" && EXTERNAL_URL.test(href);
};

const rehypeLinkTarget: Plugin<[], Root> = () => {
  return function (tree) {
    visit(tree, "element", function (node: Element) {
      if (node.tagName !== "a") return;

      if (!isExternalUrl(node.properties["href"])) return;

      node.properties["target"] = "_blank";
      node.properties["rel"] = ["noopener", "noreferrer"];
    });
  };
};

export default rehypeLinkTarget;
