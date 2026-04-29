"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Quote, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

type EditorCommand = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList" | "formatBlock";

const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const runCommand = (command: EditorCommand, argument?: string) => {
    document.execCommand(command, false, argument);
    onChange(editorRef.current?.innerHTML ?? "");
    editorRef.current?.focus();
  };

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap gap-1 border-b p-2">
        <Button type="button" size="icon" variant="ghost" onClick={() => runCommand("bold")} aria-label="ตัวหนา">
          <Bold className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => runCommand("italic")} aria-label="ตัวเอียง">
          <Italic className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => runCommand("underline")} aria-label="ขีดเส้นใต้">
          <Underline className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => runCommand("insertUnorderedList")} aria-label="รายการหัวข้อ">
          <List className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => runCommand("insertOrderedList")} aria-label="รายการลำดับ">
          <ListOrdered className="size-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => runCommand("formatBlock", "blockquote")} aria-label="คำยก">
          <Quote className="size-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-label="เนื้อหาบทความ"
        className="prose prose-sm min-h-36 max-w-none px-3 py-3 outline-none"
        onInput={() => onChange(editorRef.current?.innerHTML ?? "")}
        suppressContentEditableWarning
      />
    </div>
  );
};

export { RichTextEditor };
