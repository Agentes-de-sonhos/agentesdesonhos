import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plane, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAirports } from "@/hooks/useAirports";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

export function AdminAirBlocksTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getAirport } = useAirports();

  const { data: blocks, isLoading } = useQuery({
    queryKey: ["admin-air-blocks"],
    queryFn: async () => {
      // Supabase limita a 1000 linhas por query — paginamos para trazer tudo.
      const PAGE_SIZE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("air_blocks")
          .select("*")
          .order("departure_date", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("air_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-air-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["air-blocks"] });
      toast({ title: "Bloqueio excluído" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("air_blocks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-air-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["air-blocks"] });
      toast({ title: "Todos os bloqueios foram excluídos" });
    },
  });

  const getCityLabel = (code: string) => {
    const info = getAirport(code);
    return info ? `${info.city}` : "";
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    const parts = d.split("-");
    if (parts.length !== 3) return d;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Bloqueios Importados (air_blocks)
            </CardTitle>
            <CardDescription>
              {blocks?.length || 0} bloqueio(s) importados via Excel/texto
            </CardDescription>
          </div>
          {blocks && blocks.length > 0 && (
            <ConfirmDeleteDialog onConfirm={() => deleteAllMutation.mutate()}>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Todos
              </Button>
            </ConfirmDeleteDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : blocks && blocks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Rota Ida</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Data/Hora Ida</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Rota Volta</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Data/Hora Volta</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Operadora</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Lug.</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr key={block.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold">{block.origin}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-mono font-semibold">{block.destination}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getCityLabel(block.origin)} → {getCityLabel(block.destination)}
                      </p>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">
                        {formatDate(block.departure_date)} {block.departure_time || ""}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-1">
                        → {formatDate(block.arrival_date)} {block.arrival_time || ""}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {block.return_departure_date ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs">{block.destination}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-mono text-xs">{block.origin}</span>
                          </div>
                        </>
                      ) : "-"}
                    </td>
                    <td className="py-2 px-3">
                      {block.return_departure_date ? (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {formatDate(block.return_departure_date)} {block.return_departure_time || ""}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-1">
                            → {formatDate(block.return_arrival_date)} {block.return_arrival_time || ""}
                          </span>
                        </>
                      ) : "-"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{block.operator || block.airline}</td>
                    <td className="py-2 px-3">
                      {block.seats_available != null ? (
                        <Badge variant="secondary">{block.seats_available}</Badge>
                      ) : "-"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(block.id)}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </ConfirmDeleteDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum bloqueio importado</p>
            <p className="text-xs mt-1">Use o botão "Importar Excel" ou "Importar Texto" acima</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
