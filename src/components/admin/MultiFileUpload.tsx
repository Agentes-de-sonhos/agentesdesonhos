import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, Image as ImageIcon, Loader2, Plus, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MediaManagerModal } from "@/components/media/MediaManagerModal";
import type { MediaFile } from "@/hooks/useMediaManager";

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "pdf" | "video" | "other";
}

interface MultiFileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  accept?: string;
  acceptLabel?: string;
}

export function MultiFileUpload({
  files,
  onFilesChange,
  disabled,
  accept,
  acceptLabel,
}: MultiFileUploadProps) {
  const [mediaManagerOpen, setMediaManagerOpen] = useState(false);

  const handleMediaSelect = (url: string, file?: MediaFile) => {
    if (file) {
      const newFile: UploadedFile = {
        id: file.id,
        name: file.name,
        url: file.url,
        type: file.file_type as UploadedFile["type"],
      };
      // Avoid duplicates
      if (!files.some((f) => f.url === url)) {
        onFilesChange([...files, newFile]);
        toast.success("Arquivo selecionado!");
      } else {
        toast.info("Arquivo já adicionado.");
      }
    }
  };

  const handleRemoveFile = (fileId: string) => {
    onFilesChange(files.filter((f) => f.id !== fileId));
  };

  return (
    <div className="space-y-3">
      {/* Open Media Manager */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          "border-muted-foreground/25 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setMediaManagerOpen(true)}
      >
        <div className="flex flex-col items-center gap-2">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            Clique para abrir o Gerenciador de Arquivos
          </p>
          <p className="text-xs text-muted-foreground">
            {acceptLabel || "Selecione arquivos do gerenciador"}
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {files.length} arquivo{files.length > 1 ? "s" : ""} selecionado
            {files.length > 1 ? "s" : ""}:
          </p>
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <Badge
                key={file.id}
                variant="secondary"
                className="flex items-center gap-1 py-1.5 px-2 max-w-[200px]"
              >
                {file.type === "image" ? (
                  <ImageIcon className="h-3 w-3 shrink-0" />
                ) : (
                  <FileText className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate text-xs">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(file.id);
                  }}
                  className="ml-1 hover:text-destructive shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add More Files Button */}
      {files.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setMediaManagerOpen(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          Adicionar mais arquivos
        </Button>
      )}

      <MediaManagerModal
        open={mediaManagerOpen}
        onOpenChange={setMediaManagerOpen}
        onSelect={handleMediaSelect}
      />
    </div>
  );
}
