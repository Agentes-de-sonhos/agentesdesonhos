import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, Image as ImageIcon, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const getFileType = (fileName: string): "image" | "pdf" | "video" | "other" => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) return "image";
  if (ext === "pdf") return "pdf";
  if (["mp4", "mov", "webm", "avi"].includes(ext || "")) return "video";
  return "other";
};

export function MultiFileUpload({
  files,
  onFilesChange,
  disabled,
  accept,
  acceptLabel,
}: MultiFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (const file of Array.from(fileList)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("materials")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("materials").getPublicUrl(fileName);

        newFiles.push({
          id: fileName,
          name: file.name,
          url: publicUrl,
          type: getFileType(file.name),
        });
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
        toast.success(
          `${newFiles.length} arquivo${newFiles.length > 1 ? "s" : ""} enviado${newFiles.length > 1 ? "s" : ""}`
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar arquivos");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = (fileId: string) => {
    onFilesChange(files.filter((f) => f.id !== fileId));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Enviando arquivos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Arraste arquivos ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground">
              {acceptLabel || "Imagens (JPG, PNG, WebP) e PDFs"}
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={accept || ".pdf,.jpg,.jpeg,.png,.webp"}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || uploading}
        />
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
      {files.length > 0 && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          Adicionar mais arquivos
        </Button>
      )}
    </div>
  );
}
