import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileType,
  Download,
  Eye,
  Trash2,
  Upload,
  Loader2,
  Paperclip,
  Lock,
  Globe,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuoteDocumentsProps {
  quoteId: string;
  userId: string;
}

interface QuoteDocument {
  id: string;
  quote_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  is_public: boolean;
  created_at: string;
}

const ACCEPTED =
  ".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";
const MAX_BYTES = 25 * 1024 * 1024; // 25MB

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getIcon(fileType: string | null, fileName: string) {
  const t = (fileType || "").toLowerCase();
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (t.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return ImageIcon;
  if (t.includes("pdf") || ext === "pdf") return FileType;
  if (
    t.includes("sheet") ||
    t.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  )
    return FileSpreadsheet;
  return FileText;
}

export function QuoteDocuments({ quoteId, userId }: QuoteDocumentsProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    name: string;
    pct: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<QuoteDocument | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["quote-documents", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_documents")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QuoteDocument[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: QuoteDocument) => {
      const { error: storageError } = await supabase.storage
        .from("quote-documents")
        .remove([doc.file_path]);
      if (storageError) throw storageError;
      const { error } = await supabase
        .from("quote_documents")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento removido");
      queryClient.invalidateQueries({ queryKey: ["quote-documents", quoteId] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover"),
  });

  const uploadFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name}: tamanho máximo é 25MB`);
          continue;
        }
        try {
          setUploadProgress({ name: file.name, pct: 10 });
          const safeName = file.name.replace(/[^\w.\-]+/g, "_");
          const path = `${userId}/${quoteId}/${Date.now()}_${safeName}`;

          setUploadProgress({ name: file.name, pct: 40 });
          const { error: upErr } = await supabase.storage
            .from("quote-documents")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || undefined,
            });
          if (upErr) throw upErr;

          setUploadProgress({ name: file.name, pct: 80 });
          const { error: dbErr } = await supabase
            .from("quote_documents")
            .insert({
              quote_id: quoteId,
              user_id: userId,
              file_name: file.name,
              file_path: path,
              file_type: file.type || null,
              file_size: file.size,
            });
          if (dbErr) {
            await supabase.storage.from("quote-documents").remove([path]);
            throw dbErr;
          }
          setUploadProgress({ name: file.name, pct: 100 });
          toast.success(`${file.name} enviado`);
        } catch (e: any) {
          toast.error(`Erro em ${file.name}: ${e?.message || "falha no upload"}`);
        }
      }
      setUploadProgress(null);
      queryClient.invalidateQueries({ queryKey: ["quote-documents", quoteId] });
    },
    [quoteId, userId, queryClient]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) uploadFiles(files);
  };

  const openSignedUrl = async (doc: QuoteDocument, download = false) => {
    const { data, error } = await supabase.storage
      .from("quote-documents")
      .createSignedUrl(doc.file_path, 60 * 5, {
        download: download ? doc.file_name : undefined,
      });
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível gerar o link");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          Documentos do Orçamento
          {documents.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({documents.length})
            </span>
          )}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={!!uploadProgress}
        >
          <Upload className="h-4 w-4 mr-2" />
          Adicionar documento
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileInput}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploadProgress && inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            PDF, imagens, Word, Excel, etc. — até 25MB por arquivo
          </p>
        </div>

        {uploadProgress && (
          <div className="space-y-1.5 rounded-md border p-3 bg-muted/30">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Enviando {uploadProgress.name}
              </span>
              <span>{uploadProgress.pct}%</span>
            </div>
            <Progress value={uploadProgress.pct} className="h-1.5" />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum documento anexado ainda.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {documents.map((doc) => {
              const Icon = getIcon(doc.file_type, doc.file_name);
              return (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      title={doc.file_name}
                    >
                      {doc.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}{" "}
                      • {formatBytes(doc.file_size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Visualizar"
                      onClick={() => openSignedUrl(doc, false)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Baixar"
                      onClick={() => openSignedUrl(doc, true)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Excluir"
                      onClick={() => setPendingDelete(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <AlertDialog
          open={!!pendingDelete}
          onOpenChange={(o) => !o && setPendingDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDelete?.file_name} será removido permanentemente. Essa
                ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingDelete) deleteMutation.mutate(pendingDelete);
                  setPendingDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}