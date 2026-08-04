import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Expand,
  RefreshCw,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { RaffleSourceSelector } from "@/components/sorteador/RaffleSourceSelector";
import { AcademyEventPicker } from "@/components/sorteador/AcademyEventPicker";
import { RaffleDashboardCards } from "@/components/sorteador/RaffleDashboardCards";
import { RaffleFiltersPanel } from "@/components/sorteador/RaffleFiltersPanel";
import { RaffleParticipantsTable } from "@/components/sorteador/RaffleParticipantsTable";
import { RaffleStatsPanel } from "@/components/sorteador/RaffleStatsPanel";
import { RaffleDrawStage } from "@/components/sorteador/RaffleDrawStage";
import {
  ACADEMY_CAPABILITIES,
  formatAcademyEventLabel,
  useAcademyEventParticipants,
  useAcademyRaffleEvents,
  type AcademyRaffleEvent,
} from "@/hooks/useAcademyRaffle";
import {
  collectFilterOptions,
  computeDashboard,
  computeStats,
  evaluateEligibility,
  normalizeText,
  participantKey,
} from "@/lib/raffle/eligibility";
import { pickWinners } from "@/lib/raffle/draw";
import { parseRaffleFile } from "@/lib/raffle/parseFile";
import { exportWinnersCsv, exportWinnersXlsx, type WinnerRow } from "@/lib/raffle/export";
import {
  DEFAULT_RAFFLE_FILTERS,
  EMPTY_CAPABILITIES,
  type RaffleCapabilities,
  type RaffleFilters,
  type RaffleParticipant,
  type RaffleSource,
} from "@/lib/raffle/types";

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    /* autoplay bloqueado — silencioso por design */
  }
}

export default function Sorteador() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();

  const [source, setSource] = useState<RaffleSource>("file");
  const [title, setTitle] = useState("Sorteio ao vivo");
  const [fileParticipants, setFileParticipants] = useState<RaffleParticipant[]>([]);
  const [fileCapabilities, setFileCapabilities] = useState<RaffleCapabilities>(EMPTY_CAPABILITIES);
  const [selectedEvent, setSelectedEvent] = useState<AcademyRaffleEvent | null>(null);
  const [filters, setFilters] = useState<RaffleFilters>(DEFAULT_RAFFLE_FILTERS);

  const [raffleId, setRaffleId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [currentName, setCurrentName] = useState("");
  const [sessionWinners, setSessionWinners] = useState<RaffleParticipant[]>([]);
  const [lastWinners, setLastWinners] = useState<RaffleParticipant[]>([]);
  const [winnersCount, setWinnersCount] = useState(1);
  const [removeWinners, setRemoveWinners] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [durationMs, setDurationMs] = useState(3500);
  const [fullscreen, setFullscreen] = useState(false);
  const drawingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const eventsQuery = useAcademyRaffleEvents(source === "academy_event" && !!isAdmin);
  const participantsQuery = useAcademyEventParticipants(
    source === "academy_event" ? (selectedEvent?.training_id ?? null) : null,
  );

  const participants =
    source === "academy_event" ? (participantsQuery.data ?? []) : fileParticipants;
  const capabilities = source === "academy_event" ? ACADEMY_CAPABILITIES : fileCapabilities;

  const previousWinnerKeys = useMemo(
    () => new Set(sessionWinners.map(participantKey).filter(Boolean)),
    [sessionWinners],
  );

  const results = useMemo(
    () => evaluateEligibility(participants, filters, { previousWinnerKeys, capabilities }),
    [participants, filters, previousWinnerKeys, capabilities],
  );
  const eligible = useMemo(() => results.filter((r) => r.eligible).map((r) => r.participant), [results]);
  const dashboard = useMemo(() => computeDashboard(results, capabilities), [results, capabilities]);
  const stats = useMemo(() => computeStats(participants), [participants]);
  const options = useMemo(() => collectFilterOptions(participants), [participants]);
  const drawnIds = useMemo(() => new Set(sessionWinners.map((w) => w.id)), [sessionWinners]);

  useEffect(() => {
    setWinnersCount((c) => Math.max(1, Math.min(c, Math.max(1, eligible.length))));
  }, [eligible.length]);

  const { data: history = [] } = useQuery({
    queryKey: ["raffle-winners", raffleId],
    enabled: !!raffleId,
    queryFn: async () => {
      const { data } = await supabase
        .from("raffle_winners")
        .select("*")
        .eq("raffle_id", raffleId!)
        .order("drawn_at", { ascending: false });
      return data || [];
    },
  });

  const { data: pastRaffles = [] } = useQuery({
    queryKey: ["raffles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("raffles")
        .select(
          "id, title, participants_count, eligible_count, source, event_label, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  /** Mantém o upload CSV/Excel exatamente como antes (colunas preservadas). */
  const handleFile = useCallback(async (file: File) => {
    try {
      const parsed = await parseRaffleFile(file);
      if (!parsed.rows.length) return toast.error("Planilha vazia.");
      if (!parsed.participants.length)
        return toast.error("Nenhum nome encontrado. Verifique a coluna 'nome'.");
      setFileParticipants(parsed.participants);
      setFileCapabilities(parsed.capabilities);
      toast.success(`${parsed.participants.length} participantes carregados.`);
    } catch (e) {
      toast.error("Erro ao ler planilha: " + (e as Error).message);
    }
  }, []);

  const handleSourceChange = (next: RaffleSource) => {
    if (next === source) return;
    setSource(next);
    // Evita mistura de participantes entre origens.
    setFileParticipants([]);
    setFileCapabilities(EMPTY_CAPABILITIES);
    setSelectedEvent(null);
    setFilters(DEFAULT_RAFFLE_FILTERS);
    setSessionWinners([]);
    setLastWinners([]);
  };

  const createRaffle = async () => {
    if (!user) return toast.error("Faça login.");
    if (!participants.length) return toast.error("Carregue participantes primeiro.");
    const { data, error } = await supabase
      .from("raffles")
      .insert({
        user_id: user.id,
        title,
        participants: participants as unknown as never,
        participants_count: participants.length,
        eligible_count: eligible.length,
        source,
        academy_training_id: selectedEvent?.training_id ?? null,
        academy_trail_id: selectedEvent?.trail_id ?? null,
        event_label: selectedEvent ? formatAcademyEventLabel(selectedEvent) : null,
        filters: filters as unknown as never,
        draw_params: { winnersCount, removeWinners, durationMs } as unknown as never,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setRaffleId(data.id);
    qc.invalidateQueries({ queryKey: ["raffles", user.id] });
    toast.success("Sorteio iniciado!");
  };

  const loadRaffle = async (id: string) => {
    const { data } = await supabase.from("raffles").select("*").eq("id", id).single();
    if (!data) return;
    setRaffleId(data.id);
    setTitle(data.title);
    setSource((data.source as RaffleSource) ?? "file");
    setFileParticipants((data.participants as unknown as RaffleParticipant[]) || []);
    setLastWinners([]);
    setSessionWinners([]);
  };

  const runDraw = async () => {
    if (!raffleId || !user) return toast.error("Crie um sorteio primeiro.");
    if (drawingRef.current || spinning) return;

    let winners: RaffleParticipant[];
    try {
      ({ winners } = pickWinners({ pool: eligible, count: winnersCount, removeWinners }));
    } catch (e) {
      return toast.error((e as Error).message);
    }

    drawingRef.current = true;
    setSpinning(true);
    setLastWinners([]);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const effectiveDuration = reduced ? 0 : durationMs;

    const finish = async () => {
      setSpinning(false);
      setCurrentName(winners[0].name);
      setLastWinners(winners);
      if (removeWinners) setSessionWinners((prev) => [...prev, ...winners]);
      if (soundEnabled) playChime();
      drawingRef.current = false;

      const basePosition = history.length;
      const { error } = await supabase.from("raffle_winners").insert(
        winners.map((w, i) => ({
          raffle_id: raffleId,
          user_id: user.id,
          winner_name: w.name,
          winner_data: w as unknown as never,
          position: basePosition + i + 1,
        })),
      );
      if (error) toast.error("Não foi possível registrar os vencedores.");
      qc.invalidateQueries({ queryKey: ["raffle-winners", raffleId] });
    };

    if (effectiveDuration === 0) {
      await finish();
      return;
    }

    const start = Date.now();
    const interval = window.setInterval(() => {
      const pool = eligible;
      setCurrentName(pool[Math.floor((Date.now() / 75) % pool.length)]?.name ?? "");
      if (Date.now() - start >= effectiveDuration) {
        window.clearInterval(interval);
        void finish();
      }
    }, 75);
  };

  const winnerRows: WinnerRow[] = useMemo(
    () =>
      (history as Array<Record<string, unknown>>).map((h, i) => ({
        position: Number(h.position ?? history.length - i),
        participant: (h.winner_data as RaffleParticipant) ?? {
          id: String(h.id),
          name: String(h.winner_name ?? ""),
          raw: {},
        },
        prize: (h.prize as string) ?? null,
        drawnAt: h.drawn_at
          ? format(new Date(h.drawn_at as string), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : null,
      })),
    [history],
  );

  const resetSession = () => {
    setSessionWinners([]);
    setLastWinners([]);
    setCurrentName("");
    toast.success("Sessão reiniciada — todos voltaram ao pool.");
  };

  const newRaffle = () => {
    setRaffleId(null);
    setLastWinners([]);
    setSessionWinners([]);
    setCurrentName("");
  };

  const stage = (
    <RaffleDrawStage
      spinning={spinning}
      currentName={currentName}
      winners={lastWinners}
      fullscreen={fullscreen}
    />
  );

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold">🎲 Sorteador de Nomes</h1>
        <p className="text-muted-foreground">
          Sorteie a partir de um evento da EducaTravel Academy ou de uma planilha de participantes.
        </p>
      </header>

      {!raffleId ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Novo sorteio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <RaffleSourceSelector
                  value={source}
                  onChange={handleSourceChange}
                  academyAvailable={!!isAdmin}
                  academyDisabledHint="Disponível apenas para administradores da plataforma."
                />

                <div>
                  <Label htmlFor="raffle-title">Título</Label>
                  <Input
                    id="raffle-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {source === "academy_event" ? (
                  <div className="space-y-3">
                    <AcademyEventPicker
                      events={eventsQuery.data ?? []}
                      isLoading={eventsQuery.isLoading}
                      isError={eventsQuery.isError}
                      onRetry={() => void eventsQuery.refetch()}
                      selectedId={selectedEvent?.training_id ?? null}
                      onSelect={(e) => {
                        setSelectedEvent(e);
                        setSessionWinners([]);
                      }}
                    />
                    {participantsQuery.isLoading && <Skeleton className="h-16 w-full" />}
                    {participantsQuery.isError && (
                      <div className="flex items-center gap-3 text-sm text-destructive">
                        Erro ao carregar participantes.
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void participantsQuery.refetch()}
                        >
                          <RefreshCw className="h-3 w-3" /> Tentar novamente
                        </Button>
                      </div>
                    )}
                    {selectedEvent && !participantsQuery.isLoading && !participants.length && (
                      <p className="text-sm text-muted-foreground">
                        Este evento ainda não possui participantes registrados.
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Label>Planilha de participantes (.xlsx ou .csv)</Label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" onClick={() => fileRef.current?.click()}>
                        <Upload className="h-4 w-4" /> Escolher arquivo
                      </Button>
                      {fileParticipants.length > 0 && (
                        <Badge variant="secondary" className="self-center">
                          <Users className="mr-1 h-3 w-3" /> {fileParticipants.length} carregados
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      A planilha deve ter uma coluna "nome" (ou "name"). Demais colunas são
                      preservadas.
                    </p>
                  </div>
                )}

                <Button onClick={createRaffle} disabled={!participants.length} size="lg">
                  <Sparkles className="h-4 w-4" /> Iniciar sorteio
                </Button>
              </CardContent>
            </Card>

            {participants.length > 0 && (
              <>
                <RaffleDashboardCards dashboard={dashboard} />
                <Tabs defaultValue="lista">
                  <TabsList>
                    <TabsTrigger value="lista">Participantes</TabsTrigger>
                    <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                  </TabsList>
                  <TabsContent value="lista" className="pt-4">
                    <RaffleParticipantsTable results={results} drawnKeys={drawnIds} />
                  </TabsContent>
                  <TabsContent value="stats" className="pt-4">
                    <RaffleStatsPanel stats={stats} />
                  </TabsContent>
                </Tabs>
              </>
            )}

            {pastRaffles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de sorteios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pastRaffles.map((r: Record<string, unknown>) => (
                    <button
                      key={String(r.id)}
                      onClick={() => loadRaffle(String(r.id))}
                      className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-accent"
                    >
                      <span>
                        <span className="block font-medium">{String(r.title)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {format(new Date(String(r.created_at)), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}{" "}
                          • {String(r.participants_count)} participantes
                          {r.eligible_count ? ` • ${String(r.eligible_count)} elegíveis` : ""}
                          {r.event_label ? ` • ${String(r.event_label)}` : ""}
                        </span>
                      </span>
                      <Badge variant="outline">
                        {r.source === "academy_event" ? "Academy" : "Arquivo"}
                      </Badge>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <RaffleFiltersPanel
                filters={filters}
                onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
                onReset={() => setFilters(DEFAULT_RAFFLE_FILTERS)}
                options={options}
                capabilities={capabilities}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="truncate">{title}</CardTitle>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFullscreen(true)}
                    aria-label="Modo tela cheia"
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={newRaffle}>
                    <RefreshCw className="h-4 w-4" /> Novo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {stage}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="winners-count">
                      Quantidade de vencedores (elegíveis: {eligible.length})
                    </Label>
                    <Input
                      id="winners-count"
                      type="number"
                      min={1}
                      max={Math.max(1, eligible.length)}
                      value={winnersCount}
                      onChange={(e) => setWinnersCount(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="duration">Duração da animação: {durationMs / 1000}s</Label>
                    <Slider
                      id="duration"
                      min={0}
                      max={10000}
                      step={500}
                      value={[durationMs]}
                      onValueChange={([v]) => setDurationMs(v)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="remove-winners"
                      checked={removeWinners}
                      onCheckedChange={setRemoveWinners}
                    />
                    <Label htmlFor="remove-winners" className="text-sm font-normal">
                      Não repetir ganhadores
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="sound" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                    <Label htmlFor="sound" className="text-sm font-normal">
                      Som ao revelar
                    </Label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={runDraw} disabled={spinning || !eligible.length} size="lg">
                    <Sparkles className="h-4 w-4" />
                    {spinning ? "Sorteando..." : lastWinners.length ? "Sortear novamente" : "Sortear agora"}
                  </Button>
                  <Button variant="outline" onClick={resetSession} disabled={spinning}>
                    <RefreshCw className="h-4 w-4" /> Reiniciar
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" disabled={!winnerRows.length}>
                        <Download className="h-4 w-4" /> Exportar vencedores
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportWinnersCsv(winnerRows)}>
                        CSV (UTF-8)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportWinnersXlsx(winnerRows)}>
                        Excel (.xlsx)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            <RaffleDashboardCards dashboard={dashboard} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" /> Participantes ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RaffleParticipantsTable results={results} drawnKeys={drawnIds} />
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-yellow-500" /> Ganhadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {winnerRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum ganhador ainda.</p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {(history as Array<Record<string, unknown>>).map((w, i) => (
                      <div
                        key={String(w.id)}
                        className="flex items-center justify-between rounded-md border p-2"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            #{Number(w.position ?? history.length - i)} {String(w.winner_name)}
                          </div>
                          {(w.winner_data as RaffleParticipant)?.company && (
                            <div className="text-xs text-muted-foreground">
                              {(w.winner_data as RaffleParticipant).company}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(String(w.drawn_at)), "dd/MM HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remover ganhador"
                          onClick={async () => {
                            await supabase.from("raffle_winners").delete().eq("id", String(w.id));
                            qc.invalidateQueries({ queryKey: ["raffle-winners", raffleId] });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw]">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="space-y-4">
            {stage}
            <div className="flex justify-center gap-3">
              <Button onClick={runDraw} disabled={spinning || !eligible.length} size="lg">
                <Sparkles className="h-4 w-4" />
                {spinning ? "Sorteando..." : "Sortear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <span className="sr-only" aria-hidden="true">
        {normalizeText("")}
      </span>
    </div>
  );
}