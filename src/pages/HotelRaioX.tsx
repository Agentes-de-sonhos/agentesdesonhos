import { useState, useCallback, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Building2, Search, Loader2, Star, Shield, AlertTriangle, ThumbsUp, ThumbsDown, Users, MapPin, Sparkles, CheckCircle2, Hotel, RefreshCw, Clock, CalendarDays, FileDown, History } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateHotelRaioXPdf } from "@/lib/generateHotelRaioXPdf";

interface PlacePrediction {
  place_id: string;
  name: string;
  secondary: string;
  description: string;
  is_hotel: boolean;
}

interface CriteriaItem {
  score: number;
  comment: string;
}

interface CacheInfo {
  from_cache: boolean;
  analysis_date: string;
  is_recent: boolean;
  days_since: number;
  can_update: boolean;
}

interface HotelAnalysis {
  hotel_name: string;
  address: string;
  rating: number;
  total_reviews: number;
  score: number;
  summary: string;
  criteria: {
    service: CriteriaItem;
    cleanliness: CriteriaItem;
    location: CriteriaItem;
    comfort: CriteriaItem;
    value: CriteriaItem;
  };
  positives: string[];
  negatives: string[];
  ideal_for: string;
  alerts: string[];
  confidence: string;
  _cache?: CacheInfo;
}

const criteriaLabels: Record<string, { label: string; icon: string }> = {
  service: { label: "Atendimento", icon: "🤝" },
  cleanliness: { label: "Limpeza", icon: "✨" },
  location: { label: "Localização", icon: "📍" },
  comfort: { label: "Conforto", icon: "🛏️" },
  value: { label: "Custo-benefício", icon: "💰" },
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
    score >= 6 ? "bg-amber-100 text-amber-800 border-amber-300" :
    "bg-red-100 text-red-800 border-red-300";

  return (
    <span className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl border-2 text-3xl font-bold ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const config: Record<string, { color: string; label: string }> = {
    alto: { color: "bg-emerald-100 text-emerald-700", label: "Alta confiança" },
    médio: { color: "bg-amber-100 text-amber-700", label: "Confiança média" },
    baixo: { color: "bg-red-100 text-red-700", label: "Baixa confiança" },
  };
  const c = config[level] || config.baixo;
  return <Badge className={`${c.color} text-xs`}>{c.label}</Badge>;
}

function CriteriaBar({ label, icon, item }: { label: string; icon: string; item: CriteriaItem }) {
  const color =
    item.score >= 8 ? "bg-emerald-500" :
    item.score >= 6 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-1.5">
          {icon} {label}
        </span>
        <span className="text-sm font-semibold">{item.score.toFixed(1)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${item.score * 10}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{item.comment}</p>
    </div>
  );
}

function HotelRaioXContent() {
  const [hotelName, setHotelName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Brasil");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HotelAnalysis | null>(null);

  // Autocomplete state
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // History state
  const [historySearch, setHistorySearch] = useState("");
  const debouncedHistorySearch = useDebounce(historySearch, 300);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load history
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      let query = supabase
        .from("hotel_rx_cache")
        .select("id, hotel_name, city, country, place_id, result, created_at, updated_at")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(50);

      if (debouncedHistorySearch.trim()) {
        query = query.ilike("hotel_name", `%${debouncedHistorySearch.trim()}%`);
      }

      const { data } = await query;
      setHistoryItems(data || []);
    } catch {
      // silent
    } finally {
      setIsLoadingHistory(false);
    }
  }, [debouncedHistorySearch]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAutocomplete = useCallback(async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("hotel-autocomplete", {
        body: { input: input.trim(), city: city.trim() || undefined },
      });

      if (!error && data?.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(data.predictions.length > 0);
      }
    } catch {
      // silently fail
    } finally {
      setIsSearching(false);
    }
  }, [city]);

  const handleHotelNameChange = (value: string) => {
    setHotelName(value);
    setSelectedPlaceId(null); // Clear selection when typing

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAutocomplete(value), 300);
  };

  const handleSelectPrediction = (prediction: PlacePrediction) => {
    setHotelName(prediction.name);
    setSelectedPlaceId(prediction.place_id);
    setShowDropdown(false);
    setPredictions([]);

    // Auto-fill city from secondary text if empty
    if (!city.trim() && prediction.secondary) {
      const parts = prediction.secondary.split(",");
      if (parts.length > 0) setCity(parts[0].trim());
    }
  };

  const generateRaioX = async (forceUpdate = false) => {
    if (!hotelName.trim()) {
      toast.error("Preencha o nome do hotel.");
      return;
    }

    if (!selectedPlaceId && !city.trim()) {
      toast.error("Selecione um hotel da lista ou preencha a cidade.");
      return;
    }

    setIsLoading(true);
    if (!forceUpdate) setResult(null);

    try {
      const body: Record<string, string | boolean> = {};
      if (selectedPlaceId) body.place_id = selectedPlaceId;
      body.hotel_name = hotelName.trim();
      body.city = city.trim();
      body.country = country.trim() || "Brasil";
      if (forceUpdate) body.force_update = true;

      const { data, error } = await supabase.functions.invoke("hotel-rx", { body });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResult(data as HotelAnalysis);
      loadHistory(); // Refresh history
      if (data?._cache?.from_cache) {
        toast.info("Raio-X carregado do histórico salvo.");
      } else {
        toast.success(forceUpdate ? "Raio-X atualizado com sucesso!" : "Raio-X gerado com sucesso!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar Raio-X. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    generateRaioX(false);
  };

  return (
    <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader
            pageKey="hotel-raio-x"
            title="Raio-X do Hotel"
            subtitle="Análise inteligente de hotéis para apoiar sua recomendação ao cliente"
            icon={Building2}
          />

          {/* Search Form */}
          <Card className="border-0 shadow-card">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2 relative" ref={dropdownRef}>
                    <Label htmlFor="hotel-name">Nome do Hotel *</Label>
                    <div className="relative">
                      <Input
                        id="hotel-name"
                        placeholder="Ex: Copacabana Palace"
                        value={hotelName}
                        onChange={(e) => handleHotelNameChange(e.target.value)}
                        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
                        disabled={isLoading}
                        autoComplete="off"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {selectedPlaceId && !isSearching && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    {/* Autocomplete dropdown */}
                    {showDropdown && predictions.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                        {predictions.map((p) => (
                          <button
                            key={p.place_id}
                            type="button"
                            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left"
                            onClick={() => handleSelectPrediction(p)}
                          >
                            <div className="mt-0.5 shrink-0">
                              {p.is_hotel ? (
                                <Hotel className="h-4 w-4 text-primary" />
                              ) : (
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                              {p.secondary && (
                                <p className="text-xs text-muted-foreground truncate">{p.secondary}</p>
                              )}
                            </div>
                            {p.is_hotel && (
                              <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">Hotel</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      placeholder="Ex: Rio de Janeiro"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Input
                      id="country"
                      placeholder="Brasil"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando Raio-X do hotel…
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Gerar Raio-X
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Loading state */}
          {isLoading && (
            <Card className="border-0 shadow-card">
              <CardContent className="py-16 flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-semibold text-foreground">Gerando Raio-X do hotel…</p>
                  <p className="text-sm text-muted-foreground">Buscando dados e analisando avaliações</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* History Section - visible when no result is shown */}
          {!result && !isLoading && (
            <Card className="border-0 shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Histórico de Raio-X
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar hotel no histórico..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : historyItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {debouncedHistorySearch ? "Nenhum Raio-X encontrado para essa busca." : "Nenhum Raio-X gerado ainda. Comece buscando um hotel acima!"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historyItems.map((item) => {
                      const analysisDate = item.updated_at || item.created_at;
                      const score = (item.result as any)?.score;
                      const daysSince = Math.floor((Date.now() - new Date(analysisDate).getTime()) / (1000 * 60 * 60 * 24));
                      const isRecent = daysSince < 30;
                      const scoreColor = score >= 8 ? "text-emerald-700 bg-emerald-100" : score >= 6 ? "text-amber-700 bg-amber-100" : "text-red-700 bg-red-100";

                      return (
                        <button
                          key={item.id}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                          onClick={() => {
                            const cached: HotelAnalysis = {
                              ...(item.result as any),
                              _cache: {
                                from_cache: true,
                                analysis_date: analysisDate,
                                is_recent: isRecent,
                                days_since: daysSince,
                                can_update: !isRecent,
                              },
                            };
                            setResult(cached);
                            setHotelName(item.hotel_name || "");
                            setCity(item.city || "");
                            setCountry(item.country || "Brasil");
                            setSelectedPlaceId(item.place_id || null);
                            toast.info("Raio-X carregado do histórico.");
                          }}
                        >
                          <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${scoreColor}`}>
                            {score != null ? score.toFixed(1) : "—"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.hotel_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.city}{item.country && item.country !== "Brasil" ? `, ${item.country}` : ""}
                              {" · "}
                              {new Date(analysisDate).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          {isRecent ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] shrink-0">Recente</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px] shrink-0">Há {daysSince}d</Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && !isLoading && (
            <div className="space-y-4">
              {/* Header */}
              <Card className="border-0 shadow-card overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <ScoreBadge score={result.score} />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-foreground truncate">{result.hotel_name}</h2>
                      {result.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{result.address}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <strong>{result.rating}</strong>/5 Google
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {result.total_reviews.toLocaleString("pt-BR")} avaliações
                        </span>
                        <ConfidenceBadge level={result.confidence} />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 sm:mt-0"
                        onClick={() => {
                          generateHotelRaioXPdf(result);
                          toast.success("PDF gerado com sucesso!");
                        }}
                      >
                        <FileDown className="h-4 w-4 mr-1" />
                        Gerar PDF
                      </Button>
                    </div>
                  </div>

                  {/* Cache info bar */}
                  {result._cache && (
                    <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>
                          Análise gerada em: {new Date(result._cache.analysis_date).toLocaleDateString("pt-BR")}
                        </span>
                        {result._cache.is_recent ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" />
                            Análise recente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                            Há {result._cache.days_since} dias
                          </Badge>
                        )}
                      </div>
                      {result._cache.can_update && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateRaioX(true)}
                          disabled={isLoading}
                          className="text-xs h-7"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                          )}
                          Atualizar análise
                        </Button>
                      )}
                      {result._cache.is_recent && result._cache.from_cache && (
                        <p className="text-[10px] text-muted-foreground w-full">
                          Este Raio-X foi gerado em {new Date(result._cache.analysis_date).toLocaleDateString("pt-BR")}. Para otimizar performance, atualizações estão disponíveis a cada 30 dias.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Summary */}
              <Card className="border-0 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Resumo Estratégico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
                </CardContent>
              </Card>

              {/* Criteria */}
              <Card className="border-0 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Avaliação por Critérios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(result.criteria).map(([key, item]) => (
                    <CriteriaBar
                      key={key}
                      label={criteriaLabels[key]?.label || key}
                      icon={criteriaLabels[key]?.icon || "📊"}
                      item={item}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* Positives & Negatives */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-0 shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                      <ThumbsUp className="h-4 w-4" />
                      Pontos Fortes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.positives.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                          <span className="text-muted-foreground">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                      <ThumbsDown className="h-4 w-4" />
                      Pontos de Atenção
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.negatives.length > 0 ? result.negatives.map((n, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                          <span className="text-muted-foreground">{n}</span>
                        </li>
                      )) : (
                        <p className="text-sm text-muted-foreground">Nenhum ponto negativo identificado.</p>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Ideal for */}
              <Card className="border-0 shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Perfil Ideal de Público
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{result.ideal_for}</p>
                </CardContent>
              </Card>

              {/* Alerts */}
              {result.alerts.length > 0 && (
                <Card className="border-0 shadow-card border-l-4 border-l-amber-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      Alertas Importantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.alerts.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{a}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
    </DashboardLayout>
  );
}

export default function HotelRaioX() {
  return (
    <SubscriptionGuard feature="hotel_raio_x">
      <HotelRaioXContent />
    </SubscriptionGuard>
  );
}
