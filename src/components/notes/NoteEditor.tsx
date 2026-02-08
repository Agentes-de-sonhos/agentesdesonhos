import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Download,
  Save,
  FileText,
  Loader2,
  Check,
  Type,
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
import { cn } from "@/lib/utils";
import { Note } from "@/types/notes";
import { useAutoSave } from "@/hooks/useNotes";

interface NoteEditorProps {
  note: Note | null;
  updateNote: (data: { id: string; title?: string; content?: string }) => Promise<Note>;
  onExportPDF: (note: Note) => void;
  onExportTXT: (note: Note) => void;
}

const fontFamilies = [
  { value: "font-sans", label: "Sans Serif" },
  { value: "font-serif", label: "Serif" },
  { value: "font-mono", label: "Monospace" },
];

const fontSizes = [
  { value: "text-sm", label: "Pequeno" },
  { value: "text-base", label: "Normal" },
  { value: "text-lg", label: "Grande" },
  { value: "text-xl", label: "Extra Grande" },
];

export function NoteEditor({
  note,
  updateNote,
  onExportPDF,
  onExportTXT,
}: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fontFamily, setFontFamily] = useState("font-sans");
  const [fontSize, setFontSize] = useState("text-base");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");

  // Auto-save hook
  const { isSaving, lastSaved, saveNow } = useAutoSave(
    note?.id || null,
    title,
    content,
    updateNote
  );

  // Sync state when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || "");
    }
  }, [note?.id]);

  const handleManualSave = useCallback(async () => {
    if (note) {
      await saveNow();
    }
  }, [note, saveNow]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

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

  const alignmentClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="border-b border-border p-2 flex flex-wrap items-center gap-1 sm:gap-2">
        {/* Font Family */}
        <Select value={fontFamily} onValueChange={setFontFamily}>
          <SelectTrigger className="w-[110px] h-8">
            <Type className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select value={fontSize} onValueChange={setFontSize}>
          <SelectTrigger className="w-[100px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontSizes.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Formatting */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => execCommand("bold")}
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Negrito</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => execCommand("italic")}
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Itálico</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => execCommand("underline")}
              >
                <Underline className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sublinhado</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={textAlign === "left" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setTextAlign("left")}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alinhar à esquerda</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={textAlign === "center" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setTextAlign("center")}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Centralizar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={textAlign === "right" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setTextAlign("right")}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alinhar à direita</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => execCommand("insertUnorderedList")}
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lista com marcadores</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => execCommand("insertOrderedList")}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lista numerada</TooltipContent>
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

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Comece a escrever..."
            className={cn(
              "w-full min-h-[calc(100vh-300px)] resize-none border-none bg-transparent focus:outline-none focus:ring-0",
              fontFamily,
              fontSize,
              alignmentClasses[textAlign]
            )}
          />
        </div>
      </div>
    </div>
  );
}
