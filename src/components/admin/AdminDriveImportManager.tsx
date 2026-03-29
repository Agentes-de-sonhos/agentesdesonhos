import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  HardDrive,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Link2,
  Clock,
  FileImage,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AdminDriveImportManager() {
  const queryClient = useQueryClient();
  const [folderId, setFolderId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if Drive is connected
  const { data: driveToken } = useQuery({
    queryKey: ["google-drive-token"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_drive_tokens" as any)
        .select("id, token_expires_at, updated_at")
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  // Get saved config
  const { data: config } = useQuery({
    queryKey: ["drive-import-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drive_import_config" as any)
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data as any;
    },
  });

  // Get import logs
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["drive-import-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drive_import_logs" as any)
        .select("*")
        .order("imported_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  // Connect Google Drive
  const handleConnectDrive = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("google-drive-auth", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank", "width=600,height=700");
        toast.info("Autorize o acesso no Google e volte aqui.");
        // Poll for connection
        const poll = setInterval(async () => {
          const { data: token } = await supabase
            .from("google_drive_tokens" as any)
            .select("id")
            .limit(1)
            .maybeSingle();
          if (token) {
            clearInterval(poll);
            queryClient.invalidateQueries({ queryKey: ["google-drive-token"] });
            toast.success("Google Drive conectado!");
            setIsConnecting(false);
          }
        }, 3000);
        setTimeout(() => {
          clearInterval(poll);
          setIsConnecting(false);
        }, 120000);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao conectar Google Drive.");
      setIsConnecting(false);
    }
  };

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (folderIdToSync: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const { data, error } = await supabase.functions.invoke("drive-import-materials", {
        body: { folder_id: folderIdToSync },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["drive-import-logs"] });
      queryClient.invalidateQueries({ queryKey: ["drive-import-config"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });

      if (data.imported > 0) {
        toast.success(`Importação concluída! ${data.imported} materiais importados.`);
      } else if (data.skipped_duplicate > 0) {
        toast.info("Nenhum material novo encontrado. Todos já foram importados.");
      } else {
        toast.info("Nenhum arquivo encontrado nas pastas.");
      }
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error.message || "Erro ao importar materiais do Drive.");
    },
  });

  const handleSync = () => {
    const targetFolderId = folderId.trim() || config?.root_folder_id;
    if (!targetFolderId) {
      toast.error("Informe o ID da pasta do Google Drive.");
      return;
    }
    syncMutation.mutate(targetFolderId);
  };

  const isConnected = !!driveToken;
  const effectiveFolderId = folderId.trim() || config?.root_folder_id || "";

  const statusColors: Record<string, string> = {
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    skipped: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    success: <CheckCircle className="h-3 w-3" />,
    error: <XCircle className="h-3 w-3" />,
    skipped: <AlertTriangle className="h-3 w-3" />,
  };

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error").length;
  const skippedCount = logs.filter((l) => l.status === "skipped").length;

  return (
    <div className="space-y-6">
      {/* Connection & Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Importação via Google Drive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-sm">
              {isConnected ? "Google Drive conectado" : "Google Drive não conectado"}
            </span>
            {!isConnected && (
              <Button size="sm" onClick={handleConnectDrive} disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Conectar
              </Button>
            )}
          </div>

          {/* Folder ID Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ID da Pasta Principal (Google Drive)</label>
            <div className="flex gap-2">
              <Input
                placeholder={config?.root_folder_id || "Cole aqui o ID da pasta 'Materiais Operadoras'"}
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSync}
                disabled={!isConnected || syncMutation.isPending || !effectiveFolderId}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar Agora
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Abra a pasta no Google Drive → veja a URL → copie o ID após /folders/
            </p>
          </div>

          {/* Last sync info */}
          {config?.last_sync_at && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Última sincronização: {format(new Date(config.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}

          {/* Sync results */}
          {syncMutation.data && (
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p className="font-medium">Resultado da última sincronização:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex items-center gap-1">
                  <FileImage className="h-4 w-4 text-muted-foreground" />
                  <span>{syncMutation.data.total_files_found} encontrados</span>
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{syncMutation.data.imported} importados</span>
                </div>
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{syncMutation.data.skipped_duplicate} duplicados</span>
                </div>
                {syncMutation.data.skipped_no_supplier > 0 && (
                  <div className="flex items-center gap-1 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{syncMutation.data.skipped_no_supplier} sem operadora</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span>{syncMutation.data.errors} erros</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Structure hint */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-medium mb-2">Estrutura esperada no Google Drive:</p>
          <div className="bg-muted rounded-lg p-3 text-xs font-mono space-y-1">
            <p>📁 Materiais Operadoras/</p>
            <p className="ml-4">📁 RCA/</p>
            <p className="ml-8">📁 Pacotes/ ← categoria</p>
            <p className="ml-12">🖼️ promo-cancun.jpg</p>
            <p className="ml-8">📁 Cruzeiros/</p>
            <p className="ml-12">🖼️ msc-temporada.png</p>
            <p className="ml-4">📁 Orinter/</p>
            <p className="ml-8">🖼️ oferta-europa.jpg ← sem subpasta = "Geral"</p>
            <p className="ml-4">📁 Diversa/</p>
            <p className="ml-8">📁 Rodoviário/</p>
            <p className="ml-12">🖼️ ...</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Operadora = nome da subpasta de 1º nível • Categoria = nome da subpasta de 2º nível (ou "Geral")
          </p>
        </CardContent>
      </Card>

      {/* Import Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Histórico de Importações ({logs.length})</span>
            <div className="flex gap-2 text-xs font-normal">
              <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                {successCount} importados
              </Badge>
              <Badge variant="outline" className="bg-red-50 dark:bg-red-950">
                {errorCount} erros
              </Badge>
              <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950">
                {skippedCount} ignorados
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma importação realizada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Arquivo</th>
                    <th className="pb-2 font-medium">Operadora</th>
                    <th className="pb-2 font-medium">Categoria</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Importado em</th>
                    <th className="pb-2 font-medium">Expira em</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 max-w-[200px] truncate" title={log.drive_file_name}>
                        {log.drive_file_name}
                      </td>
                      <td className="py-2">{log.supplier_name || "-"}</td>
                      <td className="py-2">{log.category || "-"}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusColors[log.status] || ""}`}>
                          {statusIcons[log.status]}
                          {log.status === "success" ? "Importado" : log.status === "error" ? "Erro" : "Ignorado"}
                        </span>
                        {log.error_message && (
                          <p className="text-xs text-red-500 mt-1 truncate max-w-[200px]" title={log.error_message}>
                            {log.error_message}
                          </p>
                        )}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {format(new Date(log.imported_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {log.expires_at
                          ? format(new Date(log.expires_at), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
