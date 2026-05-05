import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, Sparkles, Trash2, Trophy, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Participant {
  name: string;
  agency?: string;
  [k: string]: any;
}

export default function Sorteador() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("Sorteio ao vivo");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [raffleId, setRaffleId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [currentName, setCurrentName] = useState<string>("");
  const [winner, setWinner] = useState<Participant | null>(null);
  const [excludeWinners, setExcludeWinners] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

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
        .select("id, title, participants_count, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      if (!rows.length) {
        toast.error("Planilha vazia.");
        return;
      }
      const nameKey =
        Object.keys(rows[0]).find((k) =>
          ["nome", "name", "participante", "agente", "aluno"].includes(k.toLowerCase().trim()),
        ) || Object.keys(rows[0])[0];
      const agencyKey = Object.keys(rows[0]).find((k) =>
        ["agencia", "agência", "agency", "empresa", "loja"].includes(
          k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        ),
      );
      const list: Participant[] = rows
        .map((r) => ({
          ...r,
          name: String(r[nameKey] || "").trim(),
          agency: agencyKey ? String(r[agencyKey] || "").trim() : undefined,
        }))
        .filter((p) => p.name);
      if (!list.length) {
        toast.error("Nenhum nome encontrado. Verifique a coluna 'nome'.");
        return;
      }
      setParticipants(list);
      toast.success(`${list.length} participantes carregados.`);
    } catch (e: any) {
      toast.error("Erro ao ler planilha: " + e.message);
    }
  };

  const createRaffle = async () => {
    if (!user) return toast.error("Faça login.");
    if (!participants.length) return toast.error("Carregue uma planilha primeiro.");
    const { data, error } = await supabase
      .from("raffles")
      .insert({
        user_id: user.id,
        title,
        participants: participants as any,
        participants_count: participants.length,
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
    if (data) {
      setRaffleId(data.id);
      setTitle(data.title);
      setParticipants((data.participants as any) || []);
      setWinner(null);
    }
  };

  const drawWinner = async () => {
    if (!raffleId || !user) return toast.error("Crie um sorteio primeiro.");
    const drawnNames = new Set(history.map((h: any) => h.winner_name));
    const pool = excludeWinners
      ? participants.filter((p) => !drawnNames.has(p.name))
      : participants;
    if (!pool.length) return toast.error("Nenhum participante restante.");

    setSpinning(true);
    setWinner(null);
    const duration = 3500;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const random = pool[Math.floor(Math.random() * pool.length)];
      setCurrentName(random.name);
      // Slow down progressively
      if (elapsed >= duration) {
        clearInterval(interval);
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        setCurrentName(chosen.name);
        setWinner(chosen);
        setSpinning(false);
        supabase
          .from("raffle_winners")
          .insert({
            raffle_id: raffleId,
            user_id: user.id,
            winner_name: chosen.name,
            winner_data: chosen as any,
          })
          .then(() => qc.invalidateQueries({ queryKey: ["raffle-winners", raffleId] }));
      }
    }, 75);
  };

  const reset = () => {
    setRaffleId(null);
    setParticipants([]);
    setWinner(null);
    setCurrentName("");
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🎲 Sorteador de Nomes</h1>
        <p className="text-muted-foreground">
          Importe a lista de participantes e faça sorteios ao vivo durante seus treinamentos.
        </p>
      </div>

      {!raffleId ? (
        <Card>
          <CardHeader>
            <CardTitle>Novo sorteio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Planilha de participantes (.xlsx ou .csv)</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Escolher arquivo
                </Button>
                {participants.length > 0 && (
                  <Badge variant="secondary" className="self-center">
                    <Users className="h-3 w-3 mr-1" /> {participants.length} carregados
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                A planilha deve ter uma coluna "nome" (ou "name"). Demais colunas são preservadas.
              </p>
            </div>
            <Button onClick={createRaffle} disabled={!participants.length} size="lg">
              <Sparkles className="h-4 w-4" /> Iniciar sorteio
            </Button>

            {pastRaffles.length > 0 && (
              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-3">Sorteios anteriores</h3>
                <div className="space-y-2">
                  {pastRaffles.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => loadRaffle(r.id)}
                      className="w-full text-left p-3 rounded-md border hover:bg-accent transition-colors flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} •{" "}
                          {r.participants_count} participantes
                        </div>
                      </div>
                      <Badge variant="outline">Continuar</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RefreshCw className="h-4 w-4" /> Novo
                </Button>
              </CardHeader>
              <CardContent>
                <div className="relative h-64 rounded-xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden">
                  {spinning ? (
                    <div
                      key={currentName}
                      className="text-4xl md:text-6xl font-bold animate-scale-in text-primary"
                    >
                      {currentName}
                    </div>
                  ) : winner ? (
                    <div className="text-center animate-fade-in">
                      <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                      <div className="text-sm uppercase tracking-wider text-muted-foreground">
                        Vencedor
                      </div>
                      <div className="text-4xl md:text-6xl font-bold text-primary mt-2">
                        {winner.name}
                      </div>
                      {winner.agency && (
                        <div className="text-lg md:text-xl text-muted-foreground mt-2">
                          {winner.agency}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      Pronto para sortear
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6 items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={excludeWinners}
                      onChange={(e) => setExcludeWinners(e.target.checked)}
                    />
                    Não repetir ganhadores
                  </label>
                  <Button onClick={drawWinner} disabled={spinning} size="lg">
                    <Sparkles className="h-4 w-4" />
                    {spinning ? "Sorteando..." : "Sortear agora"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Participantes ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p, i) => (
                      <Badge key={i} variant="secondary">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> Ganhadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum ganhador ainda.</p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {history.map((w: any, i: number) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between p-2 rounded-md border"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            #{history.length - i} {w.winner_name}
                          </div>
                          {(w.winner_data as any)?.agency && (
                            <div className="text-xs text-muted-foreground">
                              {(w.winner_data as any).agency}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(w.drawn_at), "dd/MM HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await supabase.from("raffle_winners").delete().eq("id", w.id);
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
    </div>
  );
}