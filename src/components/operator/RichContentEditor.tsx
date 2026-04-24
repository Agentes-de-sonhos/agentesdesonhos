import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bold, Italic, Underline as UnderlineIcon,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Minus,
  Link as LinkIcon, Highlighter, Palette, Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const TEXT_COLORS = [
  "#0F172A", "#374151", "#6B7280",
  "#DC2626", "#EA580C", "#CA8A04",
  "#16A34A", "#0891B2", "#2563EB", "#7C3AED",
];

const HIGHLIGHT_COLORS = [
  "#FEF08A", "#BBF7D0", "#BFDBFE", "#FECACA", "#FED7AA", "#E9D5FF",
];

interface RichContentEditorProps {
  label?: string;
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * Lightweight rich-text editor for commercial copy on supplier/operator pages.
 * Stores HTML. Auto-converts plain-text legacy content into paragraphs so the
 * existing data renders correctly when the admin opens it for editing.
 */
export function RichContentEditor({ label, content, onChange, placeholder }: RichContentEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");

  // If content is plain text (no HTML tags), wrap each line in a paragraph for the editor
  const initial = (() => {
    if (!content) return "";
    if (/<[a-z][\s\S]*>/i.test(content)) return content;
    return content
      .split(/\n/)
      .map((l) => `<p>${l.trim() ? escapeHtml(l) : "<br/>"}</p>`)
      .join("");
  })();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "text-primary underline", rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: initial,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[160px] px-4 py-3 focus:outline-none text-foreground prose-headings:text-foreground prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-primary",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (initial && current !== initial && current === "<p></p>") {
      editor.commands.setContent(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  const addLink = () => {
    if (!linkUrl) return;
    const url = /^https?:\/\//i.test(linkUrl) || linkUrl.startsWith("mailto:") ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkUrl("");
  };

  return (
    <div className="p-4 space-y-2">
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <div className="border rounded-xl overflow-hidden bg-background shadow-sm">
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
          <ToolBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título H1"><Heading1 className="h-4 w-4" /></ToolBtn>
          <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Subtítulo H2"><Heading2 className="h-4 w-4" /></ToolBtn>
          <ToolBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Subtítulo H3"><Heading3 className="h-4 w-4" /></ToolBtn>

          <div className="w-px h-6 bg-border mx-1" />

          <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito"><Bold className="h-4 w-4" /></ToolBtn>
          <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico"><Italic className="h-4 w-4" /></ToolBtn>
          <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado"><UnderlineIcon className="h-4 w-4" /></ToolBtn>

          <div className="w-px h-6 bg-border mx-1" />

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Cor do texto"><Palette className="h-4 w-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2">Cor do texto</p>
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map((c) => (
                  <button key={c} type="button" className="h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} onClick={() => editor.chain().focus().setColor(c).run()} />
                ))}
              </div>
              <Button size="sm" variant="ghost" className="w-full mt-2 text-xs h-7" onClick={() => editor.chain().focus().unsetColor().run()}>Remover cor</Button>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor.isActive("highlight") && "bg-accent")} title="Destaque"><Highlighter className="h-4 w-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2">Cor de destaque</p>
              <div className="grid grid-cols-6 gap-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button key={c} type="button" className="h-6 w-6 rounded-md border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()} />
                ))}
              </div>
              <Button size="sm" variant="ghost" className="w-full mt-2 text-xs h-7" onClick={() => editor.chain().focus().unsetHighlight().run()}>Remover</Button>
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-border mx-1" />

          <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista com marcadores"><List className="h-4 w-4" /></ToolBtn>
          <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada"><ListOrdered className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória"><Minus className="h-4 w-4" /></ToolBtn>

          <div className="w-px h-6 bg-border mx-1" />

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8", editor.isActive("link") && "bg-accent")} title="Inserir link ou botão"><LinkIcon className="h-4 w-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2">URL do link</p>
              <p className="text-[10px] text-muted-foreground mb-2">
                💡 Cole uma URL em uma linha sozinha (parágrafo separado) para aparecer como botão "Acessar".
              </p>
              <div className="flex gap-2">
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && addLink()} />
                <Button size="sm" className="h-8" onClick={addLink}>OK</Button>
              </div>
            </PopoverContent>
          </Popover>

          {editor.isActive("link") && (
            <ToolBtn onClick={() => editor.chain().focus().unsetLink().run()} title="Remover link"><Unlink className="h-4 w-4" /></ToolBtn>
          )}
        </div>

        <EditorContent editor={editor} />
      </div>
      {placeholder && <p className="text-[11px] text-muted-foreground">{placeholder}</p>}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}