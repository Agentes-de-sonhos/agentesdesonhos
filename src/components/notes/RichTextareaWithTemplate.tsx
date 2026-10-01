import { RichContentEditor } from "@/components/admin/PopupRichTextEditor";
import { TemplatePickerButton } from "@/components/notes/TemplatePickerButton";
import { descriptionToEditorHtml, plainTextToHtml } from "@/lib/richDescription";
import { cn } from "@/lib/utils";

interface Props {
  value?: unknown;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  [key: string]: unknown;
}

/**
 * Drop-in replacement for TextareaWithTemplate on service description/notes
 * fields: rich formatting, pasted images, and double default height.
 * Stores HTML; legacy plain text is converted on load.
 */
export function RichTextareaWithTemplate({ value, onValueChange, className }: Props) {
  const html = descriptionToEditorHtml(typeof value === "string" ? value : value == null ? "" : String(value));
  const handleChange = (next: string) => onValueChange?.(next === "<p></p>" ? "" : next);
  const handleInsert = (content: string) => {
    onValueChange?.(`${html}${plainTextToHtml(content)}`);
  };
  return (
    <div className={cn("relative", className?.includes("hidden") && "hidden")}>
      <RichContentEditor
        content={html || "<p></p>"}
        onChange={handleChange}
        editorClassName="min-h-[160px] [&_.ProseMirror]:min-h-[140px]"
      />
      <div className="absolute top-1.5 right-1.5">
        <TemplatePickerButton onInsert={handleInsert} />
      </div>
    </div>
  );
}
