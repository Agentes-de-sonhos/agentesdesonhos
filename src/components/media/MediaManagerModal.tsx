import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Search,
  FolderPlus,
  ChevronRight,
  Home,
  Folder,
  FileText,
  Film,
  Image as ImageIcon,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
  FolderInput,
  Loader2,
  FileQuestion,
  ArrowUpDown,
} from "lucide-react";
import { useMediaManager, type MediaFile, type MediaFolder } from "@/hooks/useMediaManager";
import { cn } from "@/lib/utils";

interface MediaManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, file?: MediaFile) => void;
  accept?: string; // filter by type: "image", "pdf", "video", or undefined for all
  multiple?: boolean;
}

export function MediaManagerModal({
  open,
  onOpenChange,
  onSelect,
  accept,
  multiple = false,
}: MediaManagerModalProps) {
  const {
    folders,
    files,
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
    navigateToFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    uploadFiles,
    renameFile,
    deleteFile,
    searchFiles,
    currentFolderId,
    loadContents,
  } = useMediaManager();

  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ id: string; type: "file" | "folder"; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "file" | "folder"; storagePath?: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      navigateToFolder(null);
      setSelectedFile(null);
      if (accept) {
        setFilterType(accept);
      } else {
        setFilterType("all");
      }
    }
  }, [open]);

  // Reload when filter or sort changes
  useEffect(() => {
    if (open && !searchQuery.trim()) {
      loadContents(currentFolderId);
    }
  }, [filterType, sortField, sortOrder]);

  const handleUpload = useCallback(async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const batchSize = arr.length;
    let done = 0;
    const chunkSize = 3;

    for (let i = 0; i < arr.length; i += chunkSize) {
      const chunk = arr.slice(i, i + chunkSize);
      await uploadFiles(chunk);
      done += chunk.length;
      setUploadProgress(Math.round((done / batchSize) * 100));
    }

    setUploading(false);
    setUploadProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [uploadFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      searchFiles(val);
    } else {
      navigateToFolder(currentFolderId);
    }
  }, [searchFiles, navigateToFolder, currentFolderId, setSearchQuery]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName("");
    setShowNewFolder(false);
  }, [newFolderName, createFolder]);

  const handleRename = useCallback(async () => {
    if (!renameTarget || !renameTarget.name.trim()) return;
    if (renameTarget.type === "folder") {
      await renameFolder(renameTarget.id, renameTarget.name.trim());
    } else {
      await renameFile(renameTarget.id, renameTarget.name.trim());
    }
    setRenameTarget(null);
  }, [renameTarget, renameFolder, renameFile]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "folder") {
      await deleteFolder(deleteTarget.id);
    } else {
      await deleteFile(deleteTarget.id, deleteTarget.storagePath || "");
    }
    setDeleteTarget(null);
    if (selectedFile?.id === deleteTarget.id) setSelectedFile(null);
  }, [deleteTarget, deleteFolder, deleteFile, selectedFile]);

  const handleConfirmSelect = useCallback(() => {
    if (selectedFile) {
      onSelect(selectedFile.url, selectedFile);
      onOpenChange(false);
    }
  }, [selectedFile, onSelect, onOpenChange]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image": return <ImageIcon className="h-5 w-5 text-emerald-500" />;
      case "pdf": return <FileText className="h-5 w-5 text-red-500" />;
      case "video": return <Film className="h-5 w-5 text-blue-500" />;
      default: return <FileQuestion className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const acceptInput = accept === "image" ? "image/*" : accept === "pdf" ? ".pdf" : accept === "video" ? "video/*" : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FolderInput className="h-5 w-5 text-primary" />
              Gerenciador de Arquivos
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="px-6 py-3 border-b space-y-3">
            {/* Row 1: Breadcrumbs */}
            <div className="flex items-center gap-1 text-sm flex-wrap">
              <button
                onClick={() => navigateToFolder(null)}
                className="flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <Home className="h-3.5 w-3.5" />
                Mídia
              </button>
              {breadcrumbs.map((bc) => (
                <span key={bc.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <button
                    onClick={() => navigateToFolder(bc.id)}
                    className="text-primary hover:underline"
                  >
                    {bc.name}
                  </button>
                </span>
              ))}
            </div>

            {/* Row 2: Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="gap-1.5"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? `Enviando ${uploadProgress}%` : "Upload"}
              </Button>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                multiple
                accept={acceptInput}
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewFolder(true)}
                className="gap-1.5"
              >
                <FolderPlus className="h-4 w-4" />
                Nova Pasta
              </Button>

              <div className="flex-1" />

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar arquivos..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 h-9 w-48"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="image">Imagens</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="video">Vídeos</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSortField("name"); setSortOrder("asc"); }}>
                    Nome (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField("name"); setSortOrder("desc"); }}>
                    Nome (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField("created_at"); setSortOrder("desc"); }}>
                    Mais recentes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField("created_at"); setSortOrder("asc"); }}>
                    Mais antigos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField("size_bytes"); setSortOrder("desc"); }}>
                    Maior tamanho
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField("size_bytes"); setSortOrder("asc"); }}>
                    Menor tamanho
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* New folder input */}
            {showNewFolder && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nome da pasta..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                  autoFocus
                  className="h-9 max-w-xs"
                />
                <Button size="sm" onClick={handleCreateFolder}>Criar</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>Cancelar</Button>
              </div>
            )}
          </div>

          {/* File Grid */}
          <ScrollArea className="flex-1 min-h-0">
            <div
              className={cn(
                "p-6 min-h-[400px] transition-colors",
                dragActive && "bg-primary/5 ring-2 ring-primary ring-inset rounded-lg"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : folders.length === 0 && files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Upload className="h-12 w-12 mb-4 opacity-40" />
                  <p className="font-medium">Nenhum arquivo encontrado</p>
                  <p className="text-sm mt-1">Arraste arquivos aqui ou clique em Upload</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {/* Folders */}
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="group relative flex flex-col items-center p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                      onDoubleClick={() => navigateToFolder(folder.id)}
                      onClick={() => navigateToFolder(folder.id)}
                    >
                      <Folder className="h-12 w-12 text-amber-500 mb-2" />
                      <p className="text-xs font-medium text-center truncate w-full">{folder.name}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => setRenameTarget({ id: folder.id, type: "folder", name: folder.name })}>
                            <Pencil className="h-4 w-4 mr-2" /> Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget({ id: folder.id, type: "folder" })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}

                  {/* Files */}
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        "group relative flex flex-col items-center p-2 rounded-lg border cursor-pointer transition-all",
                        selectedFile?.id === file.id
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : "bg-card hover:border-primary/50"
                      )}
                      onClick={() => setSelectedFile(file)}
                      onDoubleClick={() => {
                        setSelectedFile(file);
                        handleConfirmSelect();
                      }}
                    >
                      {file.file_type === "image" ? (
                        <div className="w-full aspect-square rounded overflow-hidden bg-muted mb-1.5">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-square rounded bg-muted flex items-center justify-center mb-1.5">
                          {getFileIcon(file.file_type)}
                        </div>
                      )}
                      <p className="text-xs font-medium text-center truncate w-full" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatSize(file.size_bytes)}</p>
                      {selectedFile?.id === file.id && (
                        <div className="absolute top-1 left-1">
                          <Check className="h-5 w-5 text-primary bg-primary/10 rounded-full p-0.5" />
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => setRenameTarget({ id: file.id, type: "file", name: file.name })}>
                            <Pencil className="h-4 w-4 mr-2" /> Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget({ id: file.id, type: "file", storagePath: file.storage_path })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {files.length} arquivo(s) · {folders.length} pasta(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button disabled={!selectedFile} onClick={handleConfirmSelect}>
                Usar arquivo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <AlertDialog open={!!renameTarget} onOpenChange={() => setRenameTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Renomear {renameTarget?.type === "folder" ? "pasta" : "arquivo"}</AlertDialogTitle>
          </AlertDialogHeader>
          <Input
            value={renameTarget?.name || ""}
            onChange={(e) => renameTarget && setRenameTarget({ ...renameTarget, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRename}>Salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteTarget?.type === "folder" ? "pasta" : "arquivo"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
