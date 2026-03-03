import { Node, mergeAttributes } from "@tiptap/core";

export interface CalloutAttributes {
  type: "info" | "warning" | "success" | "tip";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: Partial<CalloutAttributes>) => ReturnType;
      toggleCallout: (attrs?: Partial<CalloutAttributes>) => ReturnType;
    };
  }
}

export const CalloutExtension = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info" as const,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-callout-type") || "info",
        renderHTML: (attrs: Record<string, string>) => ({
          "data-callout-type": attrs.type,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout-type]" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
    return ["div", mergeAttributes({ class: "callout" }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        attrs =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      toggleCallout:
        attrs =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs),
    };
  },
});
