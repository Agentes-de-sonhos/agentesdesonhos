import { useState, useRef, useEffect } from "react";
import { Sparkles, Shuffle, Loader2, Wand2, Check, Search, Clock, MapPin, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Activity, ItineraryDay } from "@/types/itinerary";
import type { ItineraryMemory } from "@/hooks/useItineraryMemory";
import { descriptionToPlainText } from "@/lib/richDescription";

export interface AIContext {
  destination?: string;
  tripType?: string;
  budgetLevel?: string;
  travelPace?: string;
  travelersCount?: number;
  interests?: string[];
  observations?: string;
}

interface Alternative {
  title: string;
  short_description: string;
  category?: string;
  location?: string;
  estimated_duration?: string;
  estimated_cost?: string;
}

const QUICK_REFINEMENTS = [
  "Deixe mais romântico",
  "Mais econômico",
  "Menos cansativo",
  "Mais gastronômico",
  "Algo infantil",
];

function dayPeerSummary(day: ItineraryDay) {
  return day.activities.map((a) => ({
    title: a.title,
    period: a.period,
    isApproved: a.isApproved,
  }));
}

interface ActivityAIActionsProps {
  activity: Activity;
  day: ItineraryDay;
  context: AIContext;
  memory: ItineraryMemory;
  onApplyUpdate: (updates: Partial<Activity>) => void;
  onLearnInstruction: (instruction: string) => void;
}

export function ActivityAIActions({
  activity,
  day,
  context,
  memory,
  onApplyUpdate,
  onLearnInstruction,
}: ActivityAIActionsProps) {
  const [refineOpen, setRefineOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState<null | "refine" | "suggest">(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Alternative[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchCacheRef = useRef<Map<string, Alternative[]>>(new Map());

  const buildContext = () => ({
    ...context,
    dayNumber: day.dayNumber,
    date: day.date,
    period: activity.period,
    existingActivities: dayPeerSummary(day),
    approvedHighlights: memory.approved,
    memory: {
      avoid: memory.avoid,
      preferred_style: memory.preferred_style,
      pace: memory.pace,
    },
  });

  const handleRefine = async (inst: string) => {
    const finalInstruction = inst.trim();
    if (!finalInstruction) return;
    setLoading("refine");
    try {
      const { data, error } = await supabase.functions.invoke("refine-itinerary-activity", {
        body: {
          mode: "refine",
          context: buildContext(),
          current: {
            title: activity.title,
            description: descriptionToPlainText(activity.description),
            location: activity.location ?? "",
          },
          instruction: finalInstruction,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const r = data?.result;
      if (!r?.title) throw new Error("Resposta vazia");
      onApplyUpdate({
        title: r.title,
        description: r.description ?? activity.description,
        location: r.location ?? activity.location,
        estimatedDuration: r.estimated_duration ?? activity.estimatedDuration,
        estimatedCost: r.estimated_cost ?? activity.estimatedCost,
      });
      onLearnInstruction(finalInstruction);
      setRefineOpen(false);
      setInstruction("");
      toast.success("Atividade refinada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao refinar");
    } finally {
      setLoading(null);
    }
  };

  const handleSuggest = async () => {
    setSuggestOpen(true);
    if (alternatives.length) return;
    setLoading("suggest");
    try {
      const { data, error } = await supabase.functions.invoke("refine-itinerary-activity", {
        body: {
          mode: "suggest_alternatives",
          context: buildContext(),
          current: {
            title: activity.title,
            description: descriptionToPlainText(activity.description),
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list = data?.result?.alternatives ?? [];
      setAlternatives(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar sugestões");
      setSuggestOpen(false);
    } finally {
      setLoading(null);
    }
  };

  const pickAlternative = (alt: Alternative) => {
    onApplyUpdate({
      title: alt.title,
      description: alt.short_description,
      location: alt.location ?? activity.location,
      estimatedDuration: alt.estimated_duration ?? activity.estimatedDuration,
      estimatedCost: alt.estimated_cost ?? activity.estimatedCost,
    });
    setAlternatives([]);
    setSearchResults([]);
    setSearchQuery("");
    setSuggestOpen(false);
    toast.success("Atividade substituída");
  };

  const runSearch = async (q: string) => {
    const query = q.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const cacheKey = `${context.destination ?? ""}::${query.toLowerCase()}`;
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      setSearchResults(cached);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("refine-itinerary-activity", {
        body: {
          mode: "search",
          context: buildContext(),
          query,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list: Alternative[] = data?.result?.results ?? [];
      searchCacheRef.current.set(cacheKey, list);
      setSearchResults(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na busca");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!suggestOpen) return;
    searchDebounceRef.current = setTimeout(() => runSearch(searchQuery), 450);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, suggestOpen]);

  return (
    <div className="flex gap-1">
      {/* Refine */}
      <Popover open={refineOpen} onOpenChange={setRefineOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/15"
            title="Refinar atividade com IA"
            aria-label="Refinar atividade com IA"
          >
            {loading === "refine" ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <Sparkles className="h-[18px] w-[18px]" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Refinar com IA</p>
              <p className="text-xs text-muted-foreground">
                Descreva como deseja ajustar esta atividade.
              </p>
            </div>
            <Input
              autoFocus
              placeholder="Ex: deixe mais romântico"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && instruction.trim()) handleRefine(instruction);
              }}
              disabled={loading === "refine"}
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REFINEMENTS.map((q) => (
                <Badge
                  key={q}
                  variant="secondary"
                  className="cursor-pointer text-xs hover:bg-primary/15"
                  onClick={() => handleRefine(q)}
                >
                  {q}
                </Badge>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => handleRefine(instruction)}
                disabled={!instruction.trim() || loading === "refine"}
              >
                {loading === "refine" ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="mr-1 h-3 w-3" />
                )}
                Refinar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Suggest alternatives */}
      <Popover
        open={suggestOpen}
        onOpenChange={(o) => {
          setSuggestOpen(o);
          if (!o) {
            setAlternatives([]);
            setSearchResults([]);
            setSearchQuery("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/15"
            title="Gerar nova sugestão"
            aria-label="Gerar nova sugestão"
            onClick={(e) => {
              e.preventDefault();
              handleSuggest();
            }}
          >
            {loading === "suggest" ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <Shuffle className="h-[18px] w-[18px]" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] max-w-[92vw]" align="end">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Sugestões alternativas</p>
              <p className="text-xs text-muted-foreground">
                Use a IA ou busque algo específico que tenha em mente.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar atividade, passeio, restaurante ou experiência..."
                className="pl-8 h-9 text-sm"
              />
              {searching && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            {searchQuery.trim().length >= 2 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {searching && searchResults.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando experiências...
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Nenhum resultado. Tente outras palavras.
                  </p>
                ) : (
                  searchResults.map((alt, i) => (
                    <button
                      key={`s-${i}`}
                      type="button"
                      onClick={() => pickAlternative(alt)}
                      className="w-full text-left rounded-lg border p-2.5 hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug">{alt.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {alt.short_description}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                          {alt.category && (
                            <span className="inline-flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {alt.category}
                            </span>
                          )}
                          {alt.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {alt.location}
                            </span>
                          )}
                          {alt.estimated_duration && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {alt.estimated_duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Sugeridos pela IA
                  </span>
                  <div className="h-px bg-border flex-1" />
                </div>
                {loading === "suggest" && alternatives.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Gerando opções...
                  </div>
                ) : alternatives.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma sugestão.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {alternatives.map((alt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => pickAlternative(alt)}
                        className="w-full text-left rounded-lg border p-2.5 hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug">{alt.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {alt.short_description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface EmptyPeriodAISlotProps {
  day: ItineraryDay;
  period: Activity["period"];
  context: AIContext;
  memory: ItineraryMemory;
  onCreate: (activity: Omit<Activity, "id" | "orderIndex" | "isApproved">) => void;
}

export function EmptyPeriodAISlot({
  day,
  period,
  context,
  memory,
  onCreate,
}: EmptyPeriodAISlotProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Alternative[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchCacheRef = useRef<Map<string, Alternative[]>>(new Map());

  const buildContext = () => ({
    ...context,
    dayNumber: day.dayNumber,
    date: day.date,
    period,
    existingActivities: dayPeerSummary(day),
    approvedHighlights: memory.approved,
    memory: {
      avoid: memory.avoid,
      preferred_style: memory.preferred_style,
      pace: memory.pace,
    },
  });

  const loadAlternatives = async () => {
    if (alternatives.length) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("refine-itinerary-activity", {
        body: {
          mode: "suggest_alternatives",
          context: buildContext(),
          current: { title: "", description: "" },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAlternatives(data?.result?.alternatives ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao buscar sugestões");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const runSearch = async (q: string) => {
    const query = q.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const cacheKey = `${context.destination ?? ""}::${query.toLowerCase()}`;
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      setSearchResults(cached);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("refine-itinerary-activity", {
        body: { mode: "search", context: buildContext(), query },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list: Alternative[] = data?.result?.results ?? [];
      searchCacheRef.current.set(cacheKey, list);
      setSearchResults(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na busca");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!open) return;
    searchDebounceRef.current = setTimeout(() => runSearch(searchQuery), 450);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, open]);

  const pickAlternative = (alt: Alternative) => {
    onCreate({
      period,
      title: alt.title,
      description: alt.short_description ?? null,
      location: alt.location ?? null,
      estimatedDuration: alt.estimated_duration ?? null,
      estimatedCost: alt.estimated_cost ?? null,
    });
    setAlternatives([]);
    setSearchResults([]);
    setSearchQuery("");
    setOpen(false);
    toast.success("Atividade adicionada");
  };

  return (
    <div className="ml-6 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground italic">Nenhuma atividade definida</p>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) {
            loadAlternatives();
          } else {
            setAlternatives([]);
            setSearchResults([]);
            setSearchQuery("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="border-primary/50 text-primary hover:bg-primary/10"
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Gerar sugestões IA
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] max-w-[92vw]" align="end">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Escolha uma experiência</p>
              <p className="text-xs text-muted-foreground">
                Use a IA ou busque algo específico que tenha em mente.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar atividade, passeio, restaurante ou experiência..."
                className="pl-8 h-9 text-sm"
              />
              {searching && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            {searchQuery.trim().length >= 2 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {searching && searchResults.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando experiências...
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Nenhum resultado. Tente outras palavras.
                  </p>
                ) : (
                  searchResults.map((alt, i) => (
                    <button
                      key={`s-${i}`}
                      type="button"
                      onClick={() => pickAlternative(alt)}
                      className="w-full text-left rounded-lg border p-2.5 hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug">{alt.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {alt.short_description}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                          {alt.category && (
                            <span className="inline-flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {alt.category}
                            </span>
                          )}
                          {alt.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {alt.location}
                            </span>
                          )}
                          {alt.estimated_duration && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {alt.estimated_duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Sugeridos pela IA
                  </span>
                  <div className="h-px bg-border flex-1" />
                </div>
                {loading && alternatives.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Gerando opções...
                  </div>
                ) : alternatives.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma sugestão.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {alternatives.map((alt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => pickAlternative(alt)}
                        className="w-full text-left rounded-lg border p-2.5 hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug">{alt.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {alt.short_description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
