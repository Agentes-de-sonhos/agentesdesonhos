import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X, Loader2 } from "lucide-react";
import { PlaybookRichTextEditor } from "@/components/admin/PlaybookRichTextEditor";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

interface PlaybookInlineEditorProps {
  /** Current HTML content */
  content: string;
  /** Called with the new HTML when saved */
  onSave: (html: string) => Promise<void>;
  /** Placeholder shown when content is empty and not editing */
  placeholder?: string;
  /** Extra class for the read-only wrapper */
  className?: string;
  children?: React.ReactNode;
}

export function PlaybookInlineEditor({
  content,
  onSave,
  placeholder = "Conteúdo em breve para esta seção.",
  className,
  children,
}: PlaybookInlineEditorProps) {
  const { isAdmin } = useUserRole();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback(() => {
    setDraft(content);
    setEditing(true);
  }, [content]);

  const cancel = useCallback(() => {
    setEditing(false);
    setDraft(content);
  }, [content]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // error handled upstream
    } finally {
      setSaving(false);
    }
  }, [draft, onSave]);

  const hasContent = content && content.replace(/<[^>]*>/g, "").trim().length > 0;

  if (!editing) {
    return (
      <div className={cn("group relative", className)}>
        {/* Admin edit button */}
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 h-8 text-xs bg-background/90 backdrop-blur-sm shadow-sm"
            onClick={startEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        )}

        {/* Read-only content */}
        {children ? (
          children
        ) : hasContent ? (
          <div
            className="prose prose-sm max-w-none text-foreground/85 
              prose-headings:text-foreground prose-headings:font-bold
              prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
              prose-p:leading-relaxed prose-li:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-em:text-foreground/80"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic">{placeholder}</p>
        )}
      </div>
    );
  }

  // ── Editing mode ──
  return (
    <div className="space-y-3">
      <PlaybookRichTextEditor content={draft} onChange={setDraft} />
      <div className="flex items-center gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={cancel} disabled={saving} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Cancelar
        </Button>
        <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
