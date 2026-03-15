import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plane,
  Calendar,
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAirports } from "@/hooks/useAirports";

export default function BloqueiosAereos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("Todos");
  const [selectedAirline, setSelectedAirline] = useState("Todas");
  const { formatAirportLabel, getAirport } = useAirports();

  const { data: blocks, isLoading } = useQuery({
    queryKey: ["flight-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_blocks")
        .select("*")
        .eq("is_active", true)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Get unique operators and airlines for filters
  const operators = [...new Set(blocks?.map((b) => b.operator) || [])];
  const airlines = [...new Set(blocks?.map((b) => b.airline) || [])];

  const filteredBlocks = blocks?.filter((block) => {
    const term = searchTerm.toLowerCase();
    const airportInfo = getAirport(block.destination);
    const matchesSearch =
      block.destination.toLowerCase().includes(term) ||
      (airportInfo?.city?.toLowerCase().includes(term) ?? false) ||
      (airportInfo?.name?.toLowerCase().includes(term) ?? false);
    const matchesOperator =
      selectedOperator === "Todos" || block.operator === selectedOperator;
    const matchesAirline =
      selectedAirline === "Todas" || block.airline === selectedAirline;
    return matchesSearch && matchesOperator && matchesAirline;
  });

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${format(startDate, "dd MMM", { locale: ptBR })} - ${format(
      endDate,
      "dd MMM yyyy",
      { locale: ptBR }
    )}`;
  };

  const isUpcoming = (startDate: string) => {
    return new Date(startDate) > new Date();
  };

  const isOngoing = (startDate: string, endDate: string) => {
    const now = new Date();
    return new Date(startDate) <= now && new Date(endDate) >= now;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          pageKey="bloqueios-aereos"
          title="Bloqueios Aéreos"
          subtitle="Consulte bloqueios de passagens aéreas disponíveis"
          icon={Plane}
          adminTab="flight-blocks"
        />

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                <SelectTrigger>
                  <SelectValue placeholder="Operadora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas as operadoras</SelectItem>
                  {operators.map((operator) => (
                    <SelectItem key={operator} value={operator}>
                      {operator}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedAirline} onValueChange={setSelectedAirline}>
                <SelectTrigger>
                  <SelectValue placeholder="Companhia aérea" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas as companhias</SelectItem>
                  {airlines.map((airline) => (
                    <SelectItem key={airline} value={airline}>
                      {airline}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Blocks List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredBlocks && filteredBlocks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBlocks.map((block) => (
              <Card
                key={block.id}
                className="border-0 shadow-md hover:shadow-lg transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Plane className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {formatAirportLabel(block.destination)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {block.airline}
                        </p>
                      </div>
                    </div>
                    {isOngoing(block.start_date, block.end_date) ? (
                      <Badge className="bg-accent text-accent-foreground">
                        Em vigor
                      </Badge>
                    ) : isUpcoming(block.start_date) ? (
                      <Badge variant="secondary">Próximo</Badge>
                    ) : (
                      <Badge variant="outline">Encerrado</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Operadora:</span>
                    <span className="font-medium">{block.operator}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Período:</span>
                    <span className="font-medium">
                      {formatDateRange(block.start_date, block.end_date)}
                    </span>
                  </div>
                  {block.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {block.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-md">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum bloqueio encontrado</h3>
              <p className="text-muted-foreground mt-1">
                Ajuste os filtros ou aguarde novos bloqueios
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
