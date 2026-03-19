import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ComingSoonOverlay } from "@/components/subscription/ComingSoonOverlay";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
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
  MapPin,
  Loader2,
  AlertCircle,
  ArrowRight,
  Clock,
  Users,
  Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAirports } from "@/hooks/useAirports";

export default function BloqueiosAereos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAirline, setSelectedAirline] = useState("Todas");
  const { formatAirportLabel, getAirport } = useAirports();

  const { data: blocks, isLoading } = useQuery({
    queryKey: ["air-blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("air_blocks")
        .select("*")
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const airlines = [...new Set(blocks?.map((b) => b.airline).filter(Boolean) || [])];

  const filteredBlocks = blocks?.filter((block) => {
    const term = searchTerm.toLowerCase();
    const originInfo = getAirport(block.origin);
    const destInfo = getAirport(block.destination);
    const matchesSearch =
      !term ||
      block.origin.toLowerCase().includes(term) ||
      block.destination.toLowerCase().includes(term) ||
      block.airline?.toLowerCase().includes(term) ||
      originInfo?.city?.toLowerCase().includes(term) ||
      originInfo?.name?.toLowerCase().includes(term) ||
      destInfo?.city?.toLowerCase().includes(term) ||
      destInfo?.name?.toLowerCase().includes(term);
    const matchesAirline =
      selectedAirline === "Todas" || block.airline === selectedAirline;
    return matchesSearch && matchesAirline;
  });

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  };

  const getCityLabel = (code: string) => {
    const info = getAirport(code);
    return info ? `${info.city} (${code})` : code;
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return null;
    const symbol = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";
    return `${symbol} ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
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

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cidade, aeroporto ou companhia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
                <CardContent className="p-5 space-y-4">
                  {/* Route header */}
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Plane className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold flex-1 min-w-0">
                      <span className="truncate">{getCityLabel(block.origin)}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{getCityLabel(block.destination)}</span>
                    </div>
                  </div>

                  {/* Airline */}
                  <Badge variant="secondary" className="text-xs">
                    {block.airline}
                  </Badge>

                  {/* Flight details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Ida
                      </p>
                      <p className="font-medium">{formatShortDate(block.departure_date)}</p>
                      {(block.departure_time || (block as any).arrival_time) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {block.departure_time || "—"}
                          {(block as any).arrival_time && (
                            <> → {(block as any).arrival_time}</>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Volta
                      </p>
                      <p className="font-medium">
                        {formatShortDate((block as any).return_departure_date || block.return_date)}
                      </p>
                      {((block as any).return_departure_time || (block as any).return_arrival_time) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(block as any).return_departure_time || block.return_time || "—"}
                          {(block as any).return_arrival_time && (
                            <> → {(block as any).return_arrival_time}</>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price + Seats + Deadline */}
                  <div className="flex items-center justify-between pt-2 border-t text-sm">
                    <div className="flex items-center gap-3">
                      {(block as any).price && (
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Tag className="h-3.5 w-3.5" />
                          {formatPrice((block as any).price, (block as any).currency)}
                        </span>
                      )}
                      {!!(block as any).price && block.price_text?.includes("TAXAS") && (
                        <span className="text-xs text-muted-foreground">+ taxas</span>
                      )}
                    </div>
                    {block.seats_available != null && block.seats_available > 0 && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {block.seats_available} {block.seats_available === 1 ? "lugar" : "lugares"}
                      </Badge>
                    )}
                  </div>
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
