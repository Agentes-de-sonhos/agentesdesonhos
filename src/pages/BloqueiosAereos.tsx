import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ComingSoonOverlay } from "@/components/subscription/ComingSoonOverlay";
import { PageHeader } from "@/components/layout/PageHeader";
import { Loader2, Plane, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAirports } from "@/hooks/useAirports";
import { EducationalSection } from "@/components/bloqueios/EducationalSection";
import { BlockSearchForm } from "@/components/bloqueios/BlockSearchForm";
import { BlockFilters } from "@/components/bloqueios/BlockFilters";
import { BlockResultCard } from "@/components/bloqueios/BlockResultCard";
import { BlockEmptyState } from "@/components/bloqueios/BlockEmptyState";

export default function BloqueiosAereos() {
  const { getAirport } = useAirports();

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedOperator, setSelectedOperator] = useState("Todas");
  const [selectedAirline, setSelectedAirline] = useState("Todas");
  const [sortBy, setSortBy] = useState("date_asc");

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

  const getCityLabel = (code: string) => {
    const info = getAirport(code);
    return info ? `${info.city} (${code})` : code;
  };

  /**
   * Smart match: checks if a given airport code matches the search term
   * by code, city name, or airport name (partial, case-insensitive)
   */
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

  /**
   * Check if any of the block's airports (origin/destination, ida/volta) match
   */
  const blockMatchesSearch = (block: any, term: string) => {
    if (!term) return true;
    return (
      matchesSearch(block.origin, term) ||
      matchesSearch(block.destination, term) ||
      (block.return_departure_date && matchesSearch(block.destination, term)) ||
      (block.return_arrival_date && matchesSearch(block.origin, term))
    );
  };

  const matchesDateRange = (departureDate: string) => {
    if (!dateFrom && !dateTo) return true;
    const dep = new Date(departureDate + "T00:00:00");
    if (dateFrom && dep < dateFrom) return false;
    if (dateTo && dep > dateTo) return false;
    return true;
  };

  const filteredBlocks = useMemo(() => {
    if (!blocks || !hasSearched) return [];
    return blocks.filter((b) => {
      if (!blockMatchesSearch(b, searchTerm)) return false;
      if (!matchesDateRange(b.departure_date)) return false;
      if (selectedOperator !== "Todas" && b.operator !== selectedOperator) return false;
      if (selectedAirline !== "Todas" && b.airline !== selectedAirline) return false;
      return true;
    });
  }, [blocks, searchTerm, dateFrom, dateTo, selectedOperator, selectedAirline, hasSearched]);

  const fallbackBlocks = useMemo(() => {
    if (!blocks || filteredBlocks.length > 0) return [];
    return blocks.filter((b) => {
      if (!matchesDateRange(b.departure_date)) return false;
      return true;
    });
  }, [blocks, filteredBlocks, dateFrom, dateTo]);

  const sortedBlocks = useMemo(() => {
    const arr = [...filteredBlocks];
    if (sortBy === "price_asc") arr.sort((a, b) => (a.price ?? 999999) - (b.price ?? 999999));
    else if (sortBy === "price_desc") arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else arr.sort((a, b) => a.departure_date.localeCompare(b.departure_date));
    return arr;
  }, [filteredBlocks, sortBy]);

  const operators = [...new Set(blocks?.map((b) => b.operator).filter(Boolean) || [])] as string[];
  const airlines = [...new Set(blocks?.map((b) => b.airline).filter(Boolean) || [])] as string[];

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return null;
    const symbol = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";
    return `${symbol} ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const handleSearch = () => setHasSearched(true);

  const handleSuggestionClick = (dest: string) => {
    setSearchTerm(dest);
    setHasSearched(true);
  };

  const initialBlocks = useMemo(() => {
    if (hasSearched || !blocks) return [];
    return [...blocks].sort((a, b) => a.departure_date.localeCompare(b.departure_date));
  }, [blocks, hasSearched]);

  return (
    <DashboardLayout>
      <ComingSoonOverlay pageKey="bloqueios-aereos" />
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
          searchTerm={searchTerm}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onSearchTermChange={(v) => { setSearchTerm(v); setHasSearched(false); }}
          onDateFromChange={(d) => { setDateFrom(d); setHasSearched(false); }}
          onDateToChange={(d) => { setDateTo(d); setHasSearched(false); }}
          onSearch={handleSearch}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--section-flights))]" />
          </div>
        ) : hasSearched ? (
          <>
            {sortedBlocks.length > 0 && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-muted-foreground">
                    {sortedBlocks.length} bloqueio{sortedBlocks.length !== 1 ? "s" : ""} encontrado{sortedBlocks.length !== 1 ? "s" : ""}
                  </p>
                  <BlockFilters
                    operators={operators} airlines={airlines}
                    selectedOperator={selectedOperator} selectedAirline={selectedAirline} sortBy={sortBy}
                    onOperatorChange={setSelectedOperator} onAirlineChange={setSelectedAirline} onSortChange={setSortBy}
                  />
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
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
                hasSearched={hasSearched} fallbackBlocks={fallbackBlocks} origin={searchTerm}
                getCityLabel={getCityLabel} onSuggestionClick={handleSuggestionClick}
              />
            )}
          </>
        ) : (
          <>
            {initialBlocks.length > 0 && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-muted-foreground">
                    {initialBlocks.length} bloqueio{initialBlocks.length !== 1 ? "s" : ""} disponíve{initialBlocks.length !== 1 ? "is" : "l"}
                  </p>
                  <BlockFilters
                    operators={operators} airlines={airlines}
                    selectedOperator={selectedOperator} selectedAirline={selectedAirline} sortBy={sortBy}
                    onOperatorChange={setSelectedOperator} onAirlineChange={setSelectedAirline} onSortChange={setSortBy}
                  />
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Os valores e disponibilidade apresentados não refletem o estoque em tempo real. Consulte a operadora para confirmar disponibilidade e condições.</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {initialBlocks
                    .filter((b) => {
                      if (selectedOperator !== "Todas" && b.operator !== selectedOperator) return false;
                      if (selectedAirline !== "Todas" && b.airline !== selectedAirline) return false;
                      return true;
                    })
                    .map((block) => (
                      <BlockResultCard key={block.id} block={block} getCityLabel={getCityLabel} formatShortDate={formatShortDate} formatPrice={formatPrice} />
                    ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
