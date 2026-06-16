import type { Component } from "vue";

declare module "*.vue" {
  const content: Component;
  export default content;
}
