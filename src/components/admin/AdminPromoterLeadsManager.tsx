import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Building2, MapPin, Calendar, User, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BRAZILIAN_STATES, FEATURE_LABELS, TrackableFeature } from "@/types/promoter-presentation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PresentationWithPromoter {
  id: string;
  promoter_id: string;
  agency_name: string;
  agent_name: string;
  agent_email: string;
  agent_whatsapp: string;
  city: string;
  state: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  promoter_name?: string;
}

export function AdminPromoterLeadsManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [promoterFilter, setPromoterFilter] = useState<string>("all");
  const [selectedPresentation, setSelectedPresentation] = useState<string | null>(null);

  // Fetch all presentations with promoter info
  const { data: presentations, isLoading } = useQuery({
    queryKey: ["admin-promoter-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promoter_presentations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch promoter profiles
      const promoterIds = [...new Set(data.map(p => p.promoter_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", promoterIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

      return data.map(p => ({
        ...p,
        promoter_name: profileMap.get(p.promoter_id) || "Promotor",
      })) as PresentationWithPromoter[];
    },
  });

  // Fetch usage for selected presentation
  const { data: usageData } = useQuery({
    queryKey: ["presentation-usage-admin", selectedPresentation],
    queryFn: async () => {
      if (!selectedPresentation) return [];
      const { data, error } = await supabase
        .from("promoter_presentation_usage")
        .select("*")
        .eq("presentation_id", selectedPresentation);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPresentation,
  });

  // Get unique promoters for filter
  const uniquePromoters = presentations
    ? [...new Map(presentations.map(p => [p.promoter_id, { id: p.promoter_id, name: p.promoter_name }])).values()]
    : [];

  // Filter presentations
  const filteredPresentations = presentations?.filter(p => {
    const matchesSearch = 
      p.agency_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.agent_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesState = stateFilter === "all" || p.state === stateFilter;
    const matchesPromoter = promoterFilter === "all" || p.promoter_id === promoterFilter;

    return matchesSearch && matchesState && matchesPromoter;
  });

  const selectedPresentationData = presentations?.find(p => p.id === selectedPresentation);

  const exportToCSV = () => {
    if (!filteredPresentations) return;

    const headers = ["Agência", "Agente", "Email", "WhatsApp", "Cidade", "Estado", "Promotor", "Data", "Status"];
    const rows = filteredPresentations.map(p => [
      p.agency_name,
      p.agent_name,
      p.agent_email,
      p.agent_whatsapp,
      p.city,
      p.state,
      p.promoter_name,
      format(new Date(p.started_at), "dd/MM/yyyy HH:mm"),
      p.is_active ? "Em andamento" : "Finalizada",
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-promotores-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Leads de Promotores
            </CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por agência, agente, email ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {BRAZILIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={promoterFilter} onValueChange={setPromoterFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Promotor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Promotores</SelectItem>
                {uniquePromoters.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{presentations?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">
                  {presentations?.filter(p => p.is_active).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{uniquePromoters.length}</p>
                <p className="text-sm text-muted-foreground">Promotores Ativos</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">
                  {new Set(presentations?.map(p => p.state)).size || 0}
                </p>
                <p className="text-sm text-muted-foreground">Estados</p>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agência</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead className="hidden md:table-cell">Localização</TableHead>
                  <TableHead className="hidden lg:table-cell">Promotor</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando leads...
                    </TableCell>
                  </TableRow>
                ) : filteredPresentations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPresentations?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{p.agency_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{p.agent_name}</p>
                          <p className="text-sm text-muted-foreground">{p.agent_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.city}/{p.state}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.promoter_name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(p.started_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"}>
                          {p.is_active ? "Ativa" : "Finalizada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedPresentation(p.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPresentation} onOpenChange={() => setSelectedPresentation(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Apresentação</DialogTitle>
          </DialogHeader>
          
          {selectedPresentationData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Agência</p>
                  <p className="font-medium">{selectedPresentationData.agency_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agente</p>
                  <p className="font-medium">{selectedPresentationData.agent_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedPresentationData.agent_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">{selectedPresentationData.agent_whatsapp}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Localização</p>
                  <p className="font-medium">
                    {selectedPresentationData.city}/{selectedPresentationData.state}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">
                    {format(new Date(selectedPresentationData.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Funcionalidades Utilizadas</p>
                {usageData && usageData.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {usageData.map((u) => (
                      <Badge key={u.id} variant="outline">
                        {FEATURE_LABELS[u.feature_name as TrackableFeature] || u.feature_name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma funcionalidade utilizada</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
