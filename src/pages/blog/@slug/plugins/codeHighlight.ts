import type { Element, ElementContent, Root } from "hast";
import { codeToHast } from "shiki";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const theme = "github-dark-default";
const fallbackLanguage = "text";

const isElement = (node: unknown): node is Element => {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    node.type === "element"
  );
};

const textContent = (node: ElementContent): string => {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(textContent).join("");
  return "";
};

const propertyList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/);
  return [];
};

const languageFromCode = (code: Element): string => {
  const classes = propertyList(code.properties["className"]).concat(
    propertyList(code.properties["class"]),
  );
  const languageClass = classes.find((className) =>
    className.startsWith("language-"),
  );

  return languageClass?.slice("language-".length) || fallbackLanguage;
};

const trimFinalLineBreak = (code: string): string => {
  return code.replace(/\r?\n$/, "");
};

const highlightedCode = async (code: string, language: string) => {
  try {
    return await codeToHast(code, {
      lang: language,
      theme,
    });
  } catch {
    return await codeToHast(code, {
      lang: fallbackLanguage,
      theme,
    });
  }
};

const rehypeCodeHighlight: Plugin<[], Root> = () => {
  return async (tree) => {
    const tasks: Promise<void>[] = [];

    visit(tree, "element", (node, index, parent) => {
      if (
        node.tagName !== "pre" ||
        typeof index !== "number" ||
        !parent ||
        !Array.isArray(parent.children)
      ) {
        return;
      }

      const code = node.children.find(
        (child): child is Element =>
          isElement(child) && child.tagName === "code",
      );

      if (!code) return;

      tasks.push(
        (async () => {
          const highlighted = await highlightedCode(
            trimFinalLineBreak(code.children.map(textContent).join("")),
            languageFromCode(code),
          );
          const [pre] = highlighted.children;

          if (isElement(pre)) {
            parent.children[index] = pre;
          }
        })(),
      );
    });

    await Promise.all(tasks);
  };
};

export default rehypeCodeHighlight;
