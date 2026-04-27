import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plane, Search, MapPin, ArrowRight, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function BloqueiosAereosStartCard() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["air-blocks-start-summary"],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("air_blocks")
          .select("origin,destination,departure_date,seats_available")
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
    staleTime: 5 * 60 * 1000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (data || []).filter((b) => (b.departure_date || "") >= today);
  const totalSeats = upcoming.reduce(
    (sum, b) => sum + (b.seats_available || 0),
    0
  );
  const totalBlocks = upcoming.length;

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (origin) params.set("origin", origin);
    if (destination) params.set("destination", destination);
    const qs = params.toString();
    navigate(`/bloqueios-aereos${qs ? `?${qs}` : ""}`);
  };

  const handleViewAll = () => navigate("/bloqueios-aereos");

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Title */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Plane className="h-5 w-5 text-[hsl(var(--section-flights))]" />
              Bloqueios Aéreos
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-flights))]" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="text-[hsl(var(--section-flights))] hover:text-[hsl(var(--section-flights))]/80"
          >
            Ver todos
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--section-flights))]/10 text-[hsl(var(--section-flights))]">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                Total de lugares disponíveis
              </div>
              <div className="font-display text-2xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  totalSeats.toLocaleString("pt-BR")
                )}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--section-flights))]/10 text-[hsl(var(--section-flights))]">
              <Plane className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                Bloqueios ativos
              </div>
              <div className="font-display text-2xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  totalBlocks.toLocaleString("pt-BR")
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Origem (ex: GRU)"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Destino (ex: MCO)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} className="w-full sm:w-auto">
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
