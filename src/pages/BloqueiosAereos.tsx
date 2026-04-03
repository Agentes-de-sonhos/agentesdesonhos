import { useState, useMemo } from "react";
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
      return true;
    });
  }, [blocks, originTerm, destinationTerm, dateFrom, dateTo, selectedOperator, selectedAirline, hasSearched]);

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
          originTerm={originTerm}
          destinationTerm={destinationTerm}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onOriginChange={(v) => { setOriginTerm(v); setHasSearched(false); }}
          onDestinationChange={(v) => { setDestinationTerm(v); setHasSearched(false); }}
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
                hasSearched={hasSearched}
                fallbackBlocks={fallbackBlocks}
                origin={originTerm}
                getCityLabel={getCityLabel}
                onSuggestionClick={handleSuggestionClick}
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
