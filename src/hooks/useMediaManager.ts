import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MediaFolder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface MediaFile {
  id: string;
  name: string;
  original_name: string;
  file_type: "image" | "pdf" | "video" | "other";
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  url: string;
  folder_id: string | null;
  created_at: string;
}

type SortField = "name" | "created_at" | "size_bytes";
type SortOrder = "asc" | "desc";

export function useMediaManager() {
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<MediaFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const loadContents = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      // Load subfolders
      let folderQuery = supabase
        .from("media_folders")
        .select("id, name, parent_id, created_at")
        .order("name");

      if (folderId) {
        folderQuery = folderQuery.eq("parent_id", folderId);
      } else {
        folderQuery = folderQuery.is("parent_id", null);
      }

      const { data: foldersData } = await folderQuery;
      setFolders((foldersData as MediaFolder[]) || []);

      // Load files
      let fileQuery = supabase
        .from("media_files")
        .select("id, name, original_name, file_type, mime_type, size_bytes, storage_path, url, folder_id, created_at");

      if (folderId) {
        fileQuery = fileQuery.eq("folder_id", folderId);
      } else {
        fileQuery = fileQuery.is("folder_id", null);
      }

      if (filterType !== "all") {
        fileQuery = fileQuery.eq("file_type", filterType);
      }

      fileQuery = fileQuery.order(sortField, { ascending: sortOrder === "asc" });

      const { data: filesData } = await fileQuery;
      setFiles((filesData as MediaFile[]) || []);
    } catch (err) {
      console.error("Error loading media:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, sortField, sortOrder]);

  const searchFiles = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadContents(currentFolderId);
      return;
    }
    setLoading(true);
    try {
      let fileQuery = supabase
        .from("media_files")
        .select("id, name, original_name, file_type, mime_type, size_bytes, storage_path, url, folder_id, created_at")
        .ilike("name", `%${query}%`)
        .order(sortField, { ascending: sortOrder === "asc" })
        .limit(50);

      if (filterType !== "all") {
        fileQuery = fileQuery.eq("file_type", filterType);
      }

      const { data } = await fileQuery;
      setFiles((data as MediaFile[]) || []);
      setFolders([]);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, sortField, sortOrder, currentFolderId, loadContents]);

  const navigateToFolder = useCallback(async (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSearchQuery("");

    if (!folderId) {
      setBreadcrumbs([]);
      await loadContents(null);
      return;
    }

    // Build breadcrumb trail
    const trail: MediaFolder[] = [];
    let currentId: string | null = folderId;
    while (currentId) {
      const { data } = await supabase
        .from("media_folders")
        .select("id, name, parent_id, created_at")
        .eq("id", currentId)
        .single();
      if (data) {
        trail.unshift(data as MediaFolder);
        currentId = data.parent_id;
      } else {
        break;
      }
    }
    setBreadcrumbs(trail);
    await loadContents(folderId);
  }, [loadContents]);

  const createFolder = useCallback(async (name: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("media_folders").insert({
      name,
      parent_id: currentFolderId,
      created_by: userData.user?.id,
    });
    if (error) {
      toast.error("Erro ao criar pasta");
      return;
    }
    toast.success("Pasta criada!");
    await loadContents(currentFolderId);
  }, [currentFolderId, loadContents]);

  const renameFolder = useCallback(async (id: string, newName: string) => {
    const { error } = await supabase.from("media_folders").update({ name: newName }).eq("id", id);
    if (error) {
      toast.error("Erro ao renomear pasta");
      return;
    }
    toast.success("Pasta renomeada!");
    await loadContents(currentFolderId);
  }, [currentFolderId, loadContents]);

  const deleteFolder = useCallback(async (id: string) => {
    const { error } = await supabase.from("media_folders").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir pasta. Verifique se está vazia.");
      return;
    }
    toast.success("Pasta excluída!");
    await loadContents(currentFolderId);
  }, [currentFolderId, loadContents]);

  const getFileType = (mimeType: string): "image" | "pdf" | "video" | "other" => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.startsWith("video/")) return "video";
    return "other";
  };

  const uploadFiles = useCallback(async (fileList: File[]) => {
    const { data: userData } = await supabase.auth.getUser();
    const uploaded: MediaFile[] = [];

    for (const file of fileList) {
      const ext = file.name.split(".").pop() || "";
      const storagePath = `${currentFolderId || "root"}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media-files")
        .upload(storagePath, file);

      if (uploadError) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("media-files").getPublicUrl(storagePath);

      const { data: insertedFile, error: insertError } = await supabase
        .from("media_files")
        .insert({
          name: file.name,
          original_name: file.name,
          file_type: getFileType(file.type),
          mime_type: file.type,
          size_bytes: file.size,
          storage_path: storagePath,
          url: urlData.publicUrl,
          folder_id: currentFolderId,
          uploaded_by: userData.user?.id,
        })
        .select()
        .single();

      if (!insertError && insertedFile) {
        uploaded.push(insertedFile as MediaFile);
      }
    }

    if (uploaded.length > 0) {
      toast.success(`${uploaded.length} arquivo(s) enviado(s)!`);
      await loadContents(currentFolderId);
    }

    return uploaded;
  }, [currentFolderId, loadContents]);

  const renameFile = useCallback(async (id: string, newName: string) => {
    const { error } = await supabase.from("media_files").update({ name: newName }).eq("id", id);
    if (error) {
      toast.error("Erro ao renomear arquivo");
      return;
    }
    toast.success("Arquivo renomeado!");
    await loadContents(currentFolderId);
  }, [currentFolderId, loadContents]);

  const deleteFile = useCallback(async (id: string, storagePath: string) => {
    await supabase.storage.from("media-files").remove([storagePath]);
    const { error } = await supabase.from("media_files").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir arquivo");
      return;
    }
    toast.success("Arquivo excluído!");
    await loadContents(currentFolderId);
  }, [currentFolderId, loadContents]);

  const moveFile = useCallback(async (fileId: string, targetFolderId: string | null) => {
    const { error } = await supabase
      .from("media_files")
      .update({ folder_id: targetFolderId })
      .eq("id", fileId);
    if (error) {
      toast.error("Erro ao mover arquivo");
      return;
    }
    toast.success("Arquivo movido!");
    await loadContents(currentFolderId);
  }, [currentFolderId, loadContents]);

  return {
    folders,
    files,
    currentFolderId,
    breadcrumbs,
    loading,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    loadContents,
    searchFiles,
    navigateToFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    uploadFiles,
    renameFile,
    deleteFile,
    moveFile,
  };
}
