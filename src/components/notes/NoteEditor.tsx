import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Download,
  Save,
  FileText,
  Loader2,
  Check,
  Type,
  Link as LinkIcon,
  Image as ImageIcon,
  Highlighter,
  Palette,
  ListChecks,
  Indent,
  Outdent,
  Eraser,
  Minus,
  Plus,
  Plus as PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Note } from "@/types/notes";
import { useAutoSave } from "@/hooks/useNotes";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

interface NoteEditorProps {
  note: Note | null;
  updateNote: (data: { id: string; title?: string; content?: string }) => Promise<Note>;
  onExportPDF: (note: Note) => void;
  onExportTXT: (note: Note) => void;
}

const fontFamilies = [
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Helvetica, sans-serif", label: "Helvetica" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Times New Roman, serif", label: "Times New Roman" },
  { value: "Courier New, monospace", label: "Courier New" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "Tahoma, sans-serif", label: "Tahoma" },
  { value: "Trebuchet MS, sans-serif", label: "Trebuchet MS" },
];

const colorSwatches = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
  "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
];

const lineHeights = [
  { value: "1", label: "1.0" },
  { value: "1.15", label: "1.15" },
  { value: "1.5", label: "1.5" },
  { value: "2", label: "2.0" },
  { value: "2.5", label: "2.5" },
];

// Custom FontSize mark (extends TextStyle)
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/['"]+/g, "") || null,
            renderHTML: (attrs: any) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

export function NoteEditor({
  note,
  updateNote,
  onExportPDF,
  onExportTXT,
}: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fontSize, setFontSize] = useState<number>(14);
  const [lineHeight, setLineHeight] = useState<string>("1.5");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      UnderlineExt,
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      ImageExt.configure({ HTMLAttributes: { class: "max-w-full rounded-md my-2" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose max-w-none focus:outline-none min-h-[calc(100vh-340px)] [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li_label]:mr-2 [&_ul[data-type=taskList]_li_p]:m-0",
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  // Auto-save hook
  const { isSaving, lastSaved, saveNow } = useAutoSave(
    note?.id || null,
    title,
    content,
    updateNote
  );

  // Flush save when the editor unmounts (e.g. modal closes)
  const saveNowRef = useRef(saveNow);
  useEffect(() => {
    saveNowRef.current = saveNow;
  }, [saveNow]);
  useEffect(() => {
    return () => {
      saveNowRef.current?.();
    };
  }, []);

  // Sync state when note changes
  useEffect(() => {
    if (note && editor) {
      setTitle(note.title);
      const raw = note.content || "";
      // If content is plain text (legacy), wrap as paragraphs
      const html = /<[a-z][\s\S]*>/i.test(raw)
        ? raw
        : raw
            .split(/\n{2,}/)
            .map((p) => `<p>${p.replace(/\n/g, "<br/>") || "<br/>"}</p>`) 
            .join("");
      editor.commands.setContent(html || "<p></p>", { emitUpdate: false });
      setContent(html);
    }
  }, [note?.id, editor]);

  const handleManualSave = useCallback(async () => {
    if (note) {
      await saveNow();
    }
  }, [note, saveNow]);

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Selecione uma nota para editar</p>
          <p className="text-sm mt-1">ou crie uma nova nota</p>
        </div>
      </div>
    );
  }

  const applyFontSize = (size: number) => {
    const clamped = Math.max(8, Math.min(96, size));
    setFontSize(clamped);
    editor?.chain().focus().setMark("textStyle", { fontSize: `${clamped}px` }).run();
  };

  const currentFontFamily =
    (editor?.getAttributes("textStyle")?.fontFamily as string) || "Arial, sans-serif";

  const currentAlign = editor?.isActive({ textAlign: "center" })
    ? "center"
    : editor?.isActive({ textAlign: "right" })
    ? "right"
    : editor?.isActive({ textAlign: "justify" })
    ? "justify"
    : "left";

  const handleAddLink = () => {
    const prev = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL do link:", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleAddImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        editor?.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleImageByUrl = () => {
    const url = window.prompt("URL da imagem:");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="border-b border-border p-2 flex flex-wrap items-center gap-1">
        {/* Font Family */}
        <Select
          value={currentFontFamily}
          onValueChange={(v) => editor?.chain().focus().setFontFamily(v).run()}
        >
          <SelectTrigger className="w-[130px] h-8">
            <Type className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size with +/- */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-7"
            onClick={() => applyFontSize(fontSize - 1)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Input
            type="number"
            value={fontSize}
            onChange={(e) => applyFontSize(Number(e.target.value) || 14)}
            className="h-8 w-14 text-center px-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-7"
            onClick={() => applyFontSize(fontSize + 1)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Formatting */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor?.isActive("bold") ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Negrito</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor?.isActive("italic") ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Itálico</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor?.isActive("underline") ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                <Underline className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sublinhado</TooltipContent>
          </Tooltip>

          {/* Text Color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Cor do texto">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-10 gap-1">
                {colorSwatches.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    onClick={() => editor?.chain().focus().setColor(c).run()}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-7 text-xs"
                onClick={() => editor?.chain().focus().unsetColor().run()}
              >
                Remover cor
              </Button>
            </PopoverContent>
          </Popover>

          {/* Highlight */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={editor?.isActive("highlight") ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                title="Marca-texto"
              >
                <Highlighter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-10 gap-1">
                {["#fff2cc", "#fce5cd", "#f4cccc", "#d9ead3", "#cfe2f3", "#d9d2e9", "#ead1dc", "#ffff00", "#00ff00", "#ff00ff"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    onClick={() => editor?.chain().focus().toggleHighlight({ color: c }).run()}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-7 text-xs"
                onClick={() => editor?.chain().focus().unsetHighlight().run()}
              >
                Remover marca
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Link / Image */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor?.isActive("link") ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={handleAddLink}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Inserir link</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Inserir">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
                Linha horizontal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor?.chain().focus().setHardBreak().run()}>
                Quebra de linha
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImageByUrl}>Imagem por URL</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAddImage}>
                <ImageIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Inserir imagem</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Alinhamento">
              {currentAlign === "center" ? (
                <AlignCenter className="h-4 w-4" />
              ) : currentAlign === "right" ? (
                <AlignRight className="h-4 w-4" />
              ) : currentAlign === "justify" ? (
                <AlignJustify className="h-4 w-4" />
              ) : (
                <AlignLeft className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
              <AlignLeft className="h-4 w-4 mr-2" /> Esquerda
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
              <AlignCenter className="h-4 w-4 mr-2" /> Centro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
              <AlignRight className="h-4 w-4 mr-2" /> Direita
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign("justify").run()}>
              <AlignJustify className="h-4 w-4 mr-2" /> Justificado
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Line height */}
        <Select value={lineHeight} onValueChange={setLineHeight}>
          <SelectTrigger className="w-[80px] h-8" title="Espaçamento entre linhas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {lineHeights.map((lh) => (
              <SelectItem key={lh.value} value={lh.value}>
                {lh.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor?.isActive("taskList") ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => editor?.chain().focus().toggleTaskList().run()}
              >
                <ListChecks className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lista de tarefas</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor?.isActive("bulletList") ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lista com marcadores</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor?.isActive("orderedList") ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lista numerada</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  editor?.chain().focus().liftListItem("listItem").run() ||
                  editor?.chain().focus().liftListItem("taskItem").run()
                }
              >
                <Outdent className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Diminuir recuo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  editor?.chain().focus().sinkListItem("listItem").run() ||
                  editor?.chain().focus().sinkListItem("taskItem").run()
                }
              >
                <Indent className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Aumentar recuo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  editor?.chain().focus().unsetAllMarks().clearNodes().run()
                }
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpar formatação</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1" />

        {/* Save Status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : lastSaved ? (
            <>
              <Check className="h-3 w-3 text-primary" />
              <span className="hidden sm:inline">
                Salvo às {format(lastSaved, "HH:mm")}
              </span>
            </>
          ) : null}
        </div>

        {/* Actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleManualSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Salvar</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExportPDF(note)}>
              📄 Exportar como PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportTXT(note)}>
              📝 Exportar como TXT
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da nota"
            className="text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0 mb-4"
          />

          {/* Rich text content */}
          <div style={{ lineHeight }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
