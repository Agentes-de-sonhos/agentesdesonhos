import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "webp"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SupplierMaterialUploadDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: operator } = useQuery({
    queryKey: ["supplier-own-operator", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tour_operators")
        .select("id, name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && open,
    staleTime: 60_000,
  });

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const valid: File[] = [];
    for (const f of Array.from(list)) {
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        toast.error(`Formato não suportado: ${f.name}`);
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const reset = () => {
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!operator?.id) {
      toast.error("Perfil comercial não encontrado");
      return;
    }
    if (files.length === 0) return;
    setUploading(true);
    try {
      const rows: any[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `supplier-materials/${operator.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("media-files")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("media-files")
          .getPublicUrl(path);
        const isPdf = ext.toLowerCase() === "pdf";
        rows.push({
          title: file.name.replace(/\.[^.]+$/, ""),
          material_type: isPdf ? "PDF" : "Imagem",
          category: "Materiais do Fornecedor",
          supplier_id: operator.id,
          file_url: urlData.publicUrl,
          is_active: true,
          published_at: new Date().toISOString(),
        });
      }
      const { error: insErr } = await supabase.from("materials").insert(rows);
      if (insErr) throw insErr;
      toast.success(
        `${rows.length} material${rows.length > 1 ? "is" : ""} enviado${rows.length > 1 ? "s" : ""}`
      );
      qc.invalidateQueries({ queryKey: ["supplier-own-materials"] });
      qc.invalidateQueries({ queryKey: ["supplier-materials-summary"] });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar arquivos");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!uploading) {
          if (!v) reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar materiais</DialogTitle>
          <DialogDescription>
            Envie PDFs ou imagens (JPG, JPEG, PNG, WEBP) da sua empresa.
          </DialogDescription>
        </DialogHeader>

        <div
          className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 rounded-lg p-6 text-center cursor-pointer transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Clique para selecionar arquivos</p>
          <p className="text-xs text-muted-foreground mt-1">PDF · JPG · JPEG · PNG · WEBP</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((f, i) => {
              const isImg = !f.name.toLowerCase().endsWith(".pdf");
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  {isImg ? (
                    <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={uploading || files.length === 0}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Enviar {files.length > 0 ? `(${files.length})` : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}