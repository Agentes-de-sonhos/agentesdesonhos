import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  parseDriveFolderUrl,
  materialTypeFromMime,
  type ImportFileOutcome,
  type ImportSummary,
} from "@/lib/materials/driveFolder";

export interface MaterialImportSource {
  id: string;
  supplier_id: string;
  provider: string;
  label: string | null;
  folder_url: string;
  folder_id: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_result: ImportSummary | null;
  tour_operators?: { id: string; name: string; category?: string | null } | null;
}

export interface MaterialImportedFile {
  id: string;
  source_id: string | null;
  supplier_id: string;
  provider: string;
  provider_file_id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  source_url: string | null;
  storage_bucket: string;
  storage_path: string;
  status: "a_revisar" | "aprovado" | "descartado";
  material_id: string | null;
  imported_at: string;
  tour_operators?: { id: string; name: string } | null;
}

export function useDriveMaterialImports() {
  const qc = useQueryClient();

  const sourcesQuery = useQuery({
    queryKey: ["material-import-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_import_sources")
        .select("*, tour_operators(id, name, category)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MaterialImportSource[];
    },
    staleTime: 60_000,
  });

  const filesQuery = useQuery({
    queryKey: ["material-imported-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_imported_files")
        .select("*, tour_operators(id, name)")
        .order("imported_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as MaterialImportedFile[];
    },
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["material-import-sources"] });
    qc.invalidateQueries({ queryKey: ["material-imported-files"] });
  };

  const saveSource = useMutation({
    mutationFn: async (input: {
      id?: string;
      supplier_id: string;
      label?: string;
      folder_url: string;
      is_active: boolean;
    }) => {
      const parsed = parseDriveFolderUrl(input.folder_url);
      if (parsed.ok !== true) {
        throw new Error((parsed as { ok: false; error: string }).error);
      }
      const { folderId, normalizedUrl } = parsed;
      const payload = {
        supplier_id: input.supplier_id,
        provider: "google_drive",
        label: input.label?.trim() || null,
        folder_url: normalizedUrl,
        folder_id: folderId,
        is_active: input.is_active,
      };
      if (input.id) {
        const { error } = await supabase.from("material_import_sources").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("material_import_sources")
          .insert({ ...payload, created_by: userRes?.user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Fonte salva com sucesso.");
    },
    onError: (e: any) =>
      toast.error(
        e?.code === "23505" ? "Esta pasta do Google Drive já está cadastrada." : e?.message || "Erro ao salvar a fonte.",
      ),
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("material_import_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Fonte removida.");
    },
    onError: () => toast.error("Erro ao remover a fonte."),
  });

  const syncSource = useMutation({
    mutationFn: async (sourceId: string) => {
      const { data, error } = await supabase.functions.invoke("drive-folder-import", {
        body: { source_id: sourceId },
      });
      if (error) {
        let details = error.message;
        const ctx = (error as any)?.context;
        if (ctx?.text) {
          try {
            const parsed = JSON.parse(await ctx.text());
            details = parsed?.error || details;
          } catch {
            /* ignore */
          }
        }
        throw new Error(details);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { summary: ImportSummary; outcomes: ImportFileOutcome[] };
    },
    onSuccess: (data) => {
      invalidate();
      const s = data.summary;
      toast.success(
        `Importação concluída: ${s.added} adicionados, ${s.existing} já existentes, ${s.ignored} ignorados, ${s.failed} falhas.`,
      );
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao importar do Google Drive."),
  });

  /** Aprova/publica um arquivo importado, criando o material na galeria interna. */
  const approveFile = useMutation({
    mutationFn: async ({
      file,
      category,
      title,
    }: {
      file: MaterialImportedFile;
      category: string;
      title?: string;
    }) => {
      const { data: blob, error: dlError } = await supabase.storage
        .from(file.storage_bucket)
        .download(file.storage_path);
      if (dlError || !blob) throw dlError || new Error("Falha ao ler o arquivo importado.");

      const publicPath = `drive-imports/${file.supplier_id}/${file.provider_file_id}-${file.file_name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upError } = await supabase.storage.from("materials").upload(publicPath, blob, {
        contentType: file.mime_type || undefined,
        upsert: true,
      });
      if (upError) throw upError;
      const { data: urlData } = supabase.storage.from("materials").getPublicUrl(publicPath);

      const materialType = materialTypeFromMime(file.mime_type);
      const { data: material, error: matError } = await supabase
        .from("materials")
        .insert({
          title: title?.trim() || file.file_name.replace(/\.[^.]+$/, ""),
          category,
          material_type: materialType,
          supplier_id: file.supplier_id,
          file_url: urlData.publicUrl,
          thumbnail_url: materialType === "Imagem" ? urlData.publicUrl : null,
          batch_id: file.source_id,
          is_active: true,
        })
        .select("id")
        .single();
      if (matError) throw matError;

      const { data: userRes } = await supabase.auth.getUser();
      const { error: updError } = await supabase
        .from("material_imported_files")
        .update({
          status: "aprovado",
          material_id: material.id,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userRes?.user?.id ?? null,
        })
        .eq("id", file.id);
      if (updError) throw updError;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["admin-materials"] });
      toast.success("Material aprovado e publicado na galeria.");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao aprovar o material."),
  });

  const setFileStatus = useMutation({
    mutationFn: async ({ file, status }: { file: MaterialImportedFile; status: "a_revisar" | "descartado" }) => {
      const { data: userRes } = await supabase.auth.getUser();
      // Ao descartar ou voltar para revisão, o material publicado é despublicado.
      if (file.material_id) {
        await supabase.from("materials").update({ is_active: false }).eq("id", file.material_id);
      }
      const { error } = await supabase
        .from("material_imported_files")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userRes?.user?.id ?? null,
        })
        .eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["materials"] });
      toast.success(vars.status === "descartado" ? "Item descartado." : "Item mantido como A revisar.");
    },
    onError: () => toast.error("Erro ao atualizar o item."),
  });

  const openFile = async (file: MaterialImportedFile) => {
    const { data, error } = await supabase.storage
      .from(file.storage_bucket)
      .createSignedUrl(file.storage_path, 300);
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível gerar o link do arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return {
    sources: sourcesQuery.data || [],
    sourcesLoading: sourcesQuery.isLoading,
    files: filesQuery.data || [],
    filesLoading: filesQuery.isLoading,
    saveSource,
    deleteSource,
    syncSource,
    approveFile,
    setFileStatus,
    openFile,
  };
}