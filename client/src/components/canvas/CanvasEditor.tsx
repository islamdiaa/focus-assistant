import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import UnderlineExtension from "@tiptap/extension-underline";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import {
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
  useCallback,
} from "react";

import { CalloutExtension } from "./extensions/CalloutExtension";
import { SlashCommandExtension } from "./CanvasSlashMenu";
import { CanvasFloatingToolbar } from "./CanvasFloatingToolbar";

export interface CanvasEditorHandle {
  editor: Editor | null;
}

interface CanvasEditorProps {
  content: string;
  onUpdate: (data: { content: string; wordCount: number }) => void;
  placeholder?: string;
}

export const CanvasEditor = forwardRef<CanvasEditorHandle, CanvasEditorProps>(
  function CanvasEditor(
    { content, onUpdate, placeholder = "Start writing..." },
    ref
  ) {
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    const handleUpdate = useCallback(({ editor: ed }: { editor: Editor }) => {
      const json = JSON.stringify(ed.getJSON());
      const wordCount = ed.storage.characterCount?.words() ?? 0;
      onUpdateRef.current({ content: json, wordCount });
    }, []);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        UnderlineExtension,
        Placeholder.configure({ placeholder }),
        CharacterCount,
        CalloutExtension,
        SlashCommandExtension,
      ],
      content: parseContent(content),
      onUpdate: handleUpdate,
      editorProps: {
        attributes: {
          class: "tiptap prose-canvas outline-none",
        },
      },
    });

    // Expose editor to parent
    useImperativeHandle(ref, () => ({ editor }), [editor]);

    // Sync content from props (e.g. date navigation) without cursor jumps
    useEffect(() => {
      if (!editor || editor.isDestroyed) return;

      const currentJson = JSON.stringify(editor.getJSON());
      const incomingContent = content || "";

      // Only update if content actually differs
      if (incomingContent && incomingContent !== currentJson) {
        const parsed = parseContent(incomingContent);
        if (parsed && JSON.stringify(parsed) !== currentJson) {
          editor.commands.setContent(parsed);
        }
      } else if (
        !incomingContent &&
        currentJson !== JSON.stringify(editor.getJSON())
      ) {
        editor.commands.clearContent(false);
      }
    }, [content, editor]);

    if (!editor) return null;

    return (
      <div
        className="canvas-editor-wrapper max-w-prose mx-auto"
        style={{ lineHeight: 1.75 }}
      >
        <CanvasFloatingToolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    );
  }
);

function parseContent(content: string): Record<string, unknown> | undefined {
  if (!content) return undefined;
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
