import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plane,
  Search,
  MapPin,
  Calendar,
  Building2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function FlightBlocksSearchCard() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");
  const [selectedOperator, setSelectedOperator] = useState("Todos");
  const [showResults, setShowResults] = useState(false);

  const { data: blocks, isLoading } = useQuery({
    queryKey: ["flight-blocks-search"],
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

  const operators = [...new Set(blocks?.map((b) => b.operator) || [])];

  const filteredBlocks = blocks?.filter((block) => {
    const matchesDestination =
      !destination ||
      block.destination.toLowerCase().includes(destination.toLowerCase());
    const matchesOperator =
      selectedOperator === "Todos" || block.operator === selectedOperator;
    return matchesDestination && matchesOperator;
  });

  const handleSearch = () => {
    if (destination || selectedOperator !== "Todos") {
      setShowResults(true);
    }
  };

  const handleViewAll = () => {
    navigate("/bloqueios-aereos");
  };

  const isUpcoming = (startDate: string) => new Date(startDate) > new Date();
  const isOngoing = (startDate: string, endDate: string) => {
    const now = new Date();
    return new Date(startDate) <= now && new Date(endDate) >= now;
  };

  const formatDateRange = (start: string, end: string) => {
    return `${format(new Date(start), "dd MMM", { locale: ptBR })} - ${format(
      new Date(end),
      "dd MMM",
      { locale: ptBR }
    )}`;
  };

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="pt-6 space-y-4">
        <div className="flex justify-end -mt-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="text-[hsl(var(--section-flights))] hover:text-[hsl(var(--section-flights))]/80"
          >
            Ver todos
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {/* Search Form */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Destino..."
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowResults(false);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={selectedOperator}
            onValueChange={(value) => {
              setSelectedOperator(value);
              setShowResults(false);
            }}
          >
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
          <Button onClick={handleSearch} className="w-full">
            <Search className="h-4 w-4 mr-2" />
            Buscar bloqueios
          </Button>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : showResults && filteredBlocks ? (
          filteredBlocks.length > 0 ? (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                {filteredBlocks.length} bloqueio(s) encontrado(s)
              </p>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {filteredBlocks.slice(0, 5).map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate("/bloqueios-aereos")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[hsl(var(--section-flights))]/10 text-[hsl(var(--section-flights))]">
                        <Plane className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{block.destination}</span>
                          {isOngoing(block.start_date, block.end_date) ? (
                            <Badge className="bg-accent text-accent-foreground text-xs">
                              Em vigor
                            </Badge>
                          ) : isUpcoming(block.start_date) ? (
                            <Badge variant="secondary" className="text-xs">
                              Próximo
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {block.operator}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateRange(block.start_date, block.end_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filteredBlocks.length > 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={handleViewAll}
                >
                  Ver todos os {filteredBlocks.length} resultados
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground border-t pt-4">
              <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum bloqueio encontrado</p>
              <Button
                variant="link"
                size="sm"
                onClick={handleViewAll}
                className="mt-1"
              >
                Ver todos os bloqueios
              </Button>
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
