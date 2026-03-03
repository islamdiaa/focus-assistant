import { Extension } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type {
  SuggestionProps,
  SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Minus,
  Info,
} from "lucide-react";
import { createRoot, type Root } from "react-dom/client";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Slash command items ──

interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ElementType;
  command: (props: { editor: Editor; range: Range }) => void;
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large heading",
    icon: Heading1,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 1 })
        .run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium heading",
    icon: Heading2,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 2 })
        .run();
    },
  },
  {
    title: "Heading 3",
    description: "Small heading",
    icon: Heading3,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode("heading", { level: 3 })
        .run();
    },
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    icon: List,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Ordered List",
    description: "Numbered list",
    icon: ListOrdered,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Task List",
    description: "Checkboxes",
    icon: ListChecks,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Blockquote",
    description: "Quote block",
    icon: Quote,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Fenced code",
    icon: Code,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Horizontal Divider",
    description: "Separator line",
    icon: Minus,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Callout",
    description: "Info callout block",
    icon: Info,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setCallout({ type: "info" })
        .run();
    },
  },
];

// ── Slash menu popup component ──

interface SlashMenuPopupProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

function SlashMenuPopup({ items, command }: SlashMenuPopupProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedIndex);
  selectedRef.current = selectedIndex;

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Scroll selected item into view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const selectedEl = container.children[selectedIndex] as
      | HTMLElement
      | undefined;
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent): boolean => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(prev => (prev <= 0 ? items.length - 1 : prev - 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex(prev => (prev >= items.length - 1 ? 0 : prev + 1));
        return true;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = items[selectedRef.current];
        if (item) command(item);
        return true;
      }
      return false;
    },
    [items, command]
  );

  // Expose onKeyDown to parent via ref on the container
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      (
        container as HTMLDivElement & {
          onKeyDown?: (e: KeyboardEvent) => boolean;
        }
      ).onKeyDown = onKeyDown;
    }
  }, [onKeyDown]);

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="slash-menu">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            type="button"
            className={`slash-menu-item${index === selectedIndex ? " is-selected" : ""}`}
            onClick={() => command(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="icon">
              <Icon />
            </div>
            <div className="text">
              <div className="title">{item.title}</div>
              <div className="description">{item.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Suggestion render helper ──

function createSuggestionRenderer() {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let keydownHandler: ((event: KeyboardEvent) => boolean) | null = null;

  return {
    onStart(props: SuggestionProps<SlashCommandItem>) {
      container = document.createElement("div");
      container.style.position = "absolute";
      container.style.zIndex = "50";
      document.body.appendChild(container);

      root = createRoot(container);

      const rect = props.clientRect?.();
      if (rect && container) {
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.bottom + 4}px`;
      }

      root.render(
        <SlashMenuPopup
          items={props.items}
          command={item => {
            props.command(item);
          }}
        />
      );

      // Store keydown ref
      requestAnimationFrame(() => {
        if (container) {
          const inner = container.firstElementChild as
            | (HTMLElement & { onKeyDown?: (e: KeyboardEvent) => boolean })
            | null;
          if (inner?.onKeyDown) {
            keydownHandler = inner.onKeyDown;
          }
        }
      });
    },

    onUpdate(props: SuggestionProps<SlashCommandItem>) {
      if (!root || !container) return;

      const rect = props.clientRect?.();
      if (rect) {
        container.style.left = `${rect.left}px`;
        container.style.top = `${rect.bottom + 4}px`;
      }

      root.render(
        <SlashMenuPopup
          items={props.items}
          command={item => {
            props.command(item);
          }}
        />
      );

      requestAnimationFrame(() => {
        if (container) {
          const inner = container.firstElementChild as
            | (HTMLElement & { onKeyDown?: (e: KeyboardEvent) => boolean })
            | null;
          if (inner?.onKeyDown) {
            keydownHandler = inner.onKeyDown;
          }
        }
      });
    },

    onKeyDown(props: SuggestionKeyDownProps): boolean {
      if (props.event.key === "Escape") {
        cleanup();
        return true;
      }
      return keydownHandler?.(props.event) ?? false;
    },

    onExit() {
      cleanup();
    },
  };

  function cleanup() {
    if (root) {
      root.unmount();
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
    keydownHandler = null;
  }
}

// ── Slash command extension ──

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        allowedPrefixes: [" "],
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: SlashCommandItem;
        }) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => {
          return SLASH_COMMANDS.filter(item =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: createSuggestionRenderer,
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
