import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { PageHeader } from "@/components/layout/PageHeader";
import { Loader2, Plane, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAirports } from "@/hooks/useAirports";
import { EducationalSection } from "@/components/bloqueios/EducationalSection";
import { BlockSearchForm } from "@/components/bloqueios/BlockSearchForm";
import { BlockFilters } from "@/components/bloqueios/BlockFilters";
import { BlockResultCard } from "@/components/bloqueios/BlockResultCard";
import { BlockEmptyState } from "@/components/bloqueios/BlockEmptyState";
import { BlockDashboard, STRATEGIC_SEASONS, type SeasonRange } from "@/components/bloqueios/BlockDashboard";
import { useSearchParams } from "react-router-dom";

export default function BloqueiosAereos() {
  const { getAirport } = useAirports();

  const [originTerm, setOriginTerm] = useState("");
  const [destinationTerm, setDestinationTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedOperator, setSelectedOperator] = useState("Todas");
  const [selectedAirline, setSelectedAirline] = useState("Todas");
  const [sortBy, setSortBy] = useState("date_asc");
  const [minSeats, setMinSeats] = useState("0");

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [activeSeason, setActiveSeason] = useState<SeasonRange | null>(null);
  const [searchParams] = useSearchParams();

  const { data: blocks, isLoading } = useQuery({
    queryKey: ["air-blocks"],
    queryFn: async () => {
      // Supabase impõe um limite padrão de 1000 linhas por query.
      // Buscamos em páginas para garantir que TODOS os bloqueios sejam carregados
      // e o dashboard reflita os números reais.
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

  const getCityLabel = (code: string) => {
    const info = getAirport(code);
    return info ? `${info.city} (${code})` : code;
  };

  const matchesSearch = (code: string, term: string) => {
    if (!term) return true;
    const lower = term.toLowerCase();
    if (code.toLowerCase().includes(lower)) return true;
    const info = getAirport(code);
    if (!info) return false;
    return (
      info.city?.toLowerCase().includes(lower) ||
      info.name?.toLowerCase().includes(lower)
    );
  };

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const matchesDateRange = (departureDate: string) => {
    if (!dateFrom && !dateTo) return true;
    const dep = parseLocalDate(departureDate);
    if (dateFrom && dep < dateFrom) return false;
    if (dateTo && dep > dateTo) return false;
    return true;
  };

  const filteredBlocks = useMemo(() => {
    if (!blocks || !hasSearched) return [];
    return blocks.filter((b) => {
      // Origin: match block's origin field
      if (originTerm && !matchesSearch(b.origin, originTerm)) return false;
      // Destination: match block's destination field
      if (destinationTerm && !matchesSearch(b.destination, destinationTerm)) return false;
      if (!matchesDateRange(b.departure_date)) return false;
      if (selectedOperator !== "Todas" && b.operator !== selectedOperator) return false;
      if (selectedAirline !== "Todas" && b.airline !== selectedAirline) return false;
      const min = parseInt(minSeats || "0", 10);
      if (min > 0 && (b.seats_available || 0) < min) return false;
      if (activeSeason) {
        const mmdd = (b.departure_date || "").slice(5);
        const { start, end } = activeSeason;
        const inSeason = start <= end
          ? mmdd >= start && mmdd <= end
          : mmdd >= start || mmdd <= end;
        if (!inSeason) return false;
      }
      return true;
    });
  }, [blocks, originTerm, destinationTerm, dateFrom, dateTo, selectedOperator, selectedAirline, minSeats, hasSearched, activeSeason]);

  // Fallback: same origin + date range, any destination
  const fallbackBlocks = useMemo(() => {
    if (!blocks || filteredBlocks.length > 0 || !hasSearched) return [];
    return blocks.filter((b) => {
      if (originTerm && !matchesSearch(b.origin, originTerm)) return false;
      if (!matchesDateRange(b.departure_date)) return false;
      return true;
    });
  }, [blocks, filteredBlocks, originTerm, dateFrom, dateTo, hasSearched]);

  const sortedBlocks = useMemo(() => {
    const arr = [...filteredBlocks];
    if (sortBy === "price_asc") arr.sort((a, b) => (a.price ?? 999999) - (b.price ?? 999999));
    else if (sortBy === "price_desc") arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else arr.sort((a, b) => {
      const dateCmp = a.departure_date.localeCompare(b.departure_date);
      if (dateCmp !== 0) return dateCmp;
      return (a.departure_time || "").localeCompare(b.departure_time || "");
    });
    return arr;
  }, [filteredBlocks, sortBy]);

  const operators = [...new Set(blocks?.map((b) => b.operator).filter(Boolean) || [])] as string[];
  const airlines = [...new Set(blocks?.map((b) => b.airline).filter(Boolean) || [])] as string[];

  // Dashboard data: when user has searched, reflect filtered results; otherwise show full overview
  const dashboardBlocks = useMemo(() => {
    if (hasSearched) return sortedBlocks;
    return blocks || [];
  }, [hasSearched, sortedBlocks, blocks]);

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return null;
    const symbol = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";
    return `${symbol} ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const handleSearch = () => setHasSearched(true);

  const handleSuggestionClick = (dest: string) => {
    setDestinationTerm(dest);
    setHasSearched(true);
  };

  // Dashboard clicks open results in a NEW TAB with filters as query params
  const openInNewTab = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    window.open(`/bloqueios-aereos?${qs}`, "_blank", "noopener,noreferrer");
  };

  const handleFilterAirline = (airline: string) => openInNewTab({ airline });
  const handleFilterOperator = (operator: string) => openInNewTab({ operator });
  const handleFilterOrigin = (origin: string) => openInNewTab({ origin });
  const handleFilterDestination = (destination: string) => openInNewTab({ destination });
  const handleFilterRoute = (origin: string, destination: string) =>
    openInNewTab({ origin, destination });
  const handleFilterSeason = (season: SeasonRange) => openInNewTab({ season: season.key });

  // Apply filters from URL query params (when opened from dashboard in new tab)
  useEffect(() => {
    const origin = searchParams.get("origin");
    const destination = searchParams.get("destination");
    const airline = searchParams.get("airline");
    const operator = searchParams.get("operator");
    const seasonKey = searchParams.get("season");

    let didApply = false;
    if (origin) { setOriginTerm(origin); didApply = true; }
    if (destination) { setDestinationTerm(destination); didApply = true; }
    if (airline) { setSelectedAirline(airline); didApply = true; }
    if (operator) { setSelectedOperator(operator); didApply = true; }
    if (seasonKey) {
      const s = STRATEGIC_SEASONS.find((x) => x.key === seasonKey);
      if (s) { setActiveSeason(s); didApply = true; }
    }
    if (didApply) {
      setHasSearched(true);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const initialBlocks = useMemo(() => {
    if (hasSearched || !blocks) return [];
    return [...blocks].sort((a, b) => {
      const dateCmp = a.departure_date.localeCompare(b.departure_date);
      if (dateCmp !== 0) return dateCmp;
      return (a.departure_time || "").localeCompare(b.departure_time || "");
    });
  }, [blocks, hasSearched]);

  return (
    <DashboardLayout>
      
      <div className="space-y-6">
        <PageHeader
          pageKey="bloqueios-aereos"
          title="Bloqueios Aéreos"
          subtitle="Encontre tarifas especiais negociadas por operadoras parceiras"
          icon={Plane}
          adminTab="flight-blocks"
        />

        <EducationalSection />

        <BlockSearchForm
          originTerm={originTerm}
          destinationTerm={destinationTerm}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onOriginChange={(v) => { setOriginTerm(v); setActiveSeason(null); setHasSearched(false); }}
          onDestinationChange={(v) => { setDestinationTerm(v); setActiveSeason(null); setHasSearched(false); }}
          onDateFromChange={(d) => { setDateFrom(d); setActiveSeason(null); setHasSearched(false); }}
          onDateToChange={(d) => { setDateTo(d); setActiveSeason(null); setHasSearched(false); }}
          onSearch={handleSearch}
          showEmptyHint={!hasSearched && !isLoading}
        />

        {/* Strategic Dashboard — always visible, reacts to filters */}
        {!isLoading && dashboardBlocks.length > 0 && (
          <BlockDashboard
            blocks={dashboardBlocks as any}
            getCityLabel={getCityLabel}
            onFilterAirline={handleFilterAirline}
            onFilterOperator={handleFilterOperator}
            onFilterOrigin={handleFilterOrigin}
            onFilterDestination={handleFilterDestination}
            onFilterRoute={handleFilterRoute}
            onFilterSeason={handleFilterSeason}
          />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--section-flights))]" />
          </div>
        ) : hasSearched ? (
          <div ref={resultsRef}>
            {sortedBlocks.length > 0 && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <p className="text-sm text-muted-foreground">
                    {sortedBlocks.length} bloqueio{sortedBlocks.length !== 1 ? "s" : ""} encontrado{sortedBlocks.length !== 1 ? "s" : ""}
                    {activeSeason && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--section-flights))]/10 text-[hsl(var(--section-flights))]">
                        Período: {activeSeason.label}
                        <button
                          onClick={() => setActiveSeason(null)}
                          className="ml-1 hover:underline"
                        >
                          limpar
                        </button>
                      </span>
                    )}
                  </p>
                  <BlockFilters
                    operators={operators} airlines={airlines}
                    selectedOperator={selectedOperator} selectedAirline={selectedAirline} sortBy={sortBy} minSeats={minSeats}
                    onOperatorChange={setSelectedOperator} onAirlineChange={setSelectedAirline} onSortChange={setSortBy} onMinSeatsChange={setMinSeats}
                  />
                </div>

                <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Os valores e disponibilidade apresentados não refletem o estoque em tempo real. Consulte a operadora para confirmar disponibilidade e condições.</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sortedBlocks.map((block) => (
                    <BlockResultCard key={block.id} block={block} getCityLabel={getCityLabel} formatShortDate={formatShortDate} formatPrice={formatPrice} />
                  ))}
                </div>
              </>
            )}

            {sortedBlocks.length === 0 && (
              <BlockEmptyState
                hasSearched={hasSearched}
                fallbackBlocks={fallbackBlocks}
                origin={originTerm}
                getCityLabel={getCityLabel}
                onSuggestionClick={handleSuggestionClick}
              />
            )}
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
