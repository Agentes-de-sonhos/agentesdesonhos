import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Crown,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Users,
} from "lucide-react";
import {
  useAwardTally,
  useAwardsList,
} from "@/hooks/useMonthlyAward";
import { MONTH_NAMES } from "@/types/community";
import { toast } from "@/hooks/use-toast";

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function reasonLabel(reason: string | null): string | null {
  if (!reason) return null;
  const map: Record<string, string> = {
    not_agent: "Não é agente elegível",
    admin_removed: "Removido pelo admin",
    fraud: "Sinalizado como fraude",
    spam: "Sinalizado como spam",
    max_wins_per_year_reached: "Já venceu o máximo do ano",
    won_previous_month: "Venceu no mês anterior",
  };
  return map[reason] ?? reason;
}

export function AdminMonthlyAwardManager() {
  const awardsQuery = useAwardsList(true);
  const awards = awardsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const currentId = selectedId ?? awards[0]?.id ?? null;
  const selectedAward = awards.find((a) => a.id === currentId) ?? null;

  const {
    tally,
    isLoading,
    refetch,
    confirm,
    isConfirming,
    revert,
    isReverting,
  } = useAwardTally(currentId);

  const [confirmTarget, setConfirmTarget] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [tieReason, setTieReason] = useState("");
  const [revertOpen, setRevertOpen] = useState(false);

  const totalVotes = useMemo(
    () => tally.reduce((acc, r) => acc + (r.votes_count ?? 0), 0),
    [tally],
  );
  const eligibleCount = tally.filter(
    (r) => r.eligible && !r.disqualified_by_history,
  ).length;

  const votingEnded =
    !!selectedAward?.voting_end_at &&
    new Date(selectedAward.voting_end_at).getTime() < Date.now();
  const alreadyPublished = !!selectedAward?.published_at;

  const detectedTie = useMemo(() => {
    const eligibles = tally.filter(
      (r) => r.eligible && !r.disqualified_by_history,
    );
    if (eligibles.length < 2) return false;
    const top = eligibles[0];
    return (
      top.votes_count === eligibles[1].votes_count &&
      top.contributions_count === eligibles[1].contributions_count &&
      top.active_days_count === eligibles[1].active_days_count &&
      top.third_party_replies_count === eligibles[1].third_party_replies_count
    );
  }, [tally]);

  const handleConfirm = async () => {
    if (!confirmTarget || !currentId) return;
    try {
      await confirm(confirmTarget.userId, tieReason.trim() || null);
      toast({
        title: "Vencedor confirmado",
        description: `${confirmTarget.name} foi registrado como Destaque do Mês.`,
      });
      setConfirmTarget(null);
      setTieReason("");
      await refetch();
    } catch (e: any) {
      const map: Record<string, string> = {
        not_authorized: "Apenas administradores podem confirmar o vencedor.",
        voting_still_open: "A votação ainda não terminou.",
        winner_not_eligible: "Este indicado não está elegível.",
        max_wins_per_year_reached: "Este agente já atingiu o limite anual de vitórias.",
        won_previous_month: "Este agente venceu no mês anterior.",
      };
      toast({
        title: "Não foi possível confirmar",
        description: map[e?.message] ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const handleRevert = async () => {
    if (!currentId) return;
    try {
      await revert(currentId);
      toast({
        title: "Confirmação revertida",
        description: "A apuração foi reaberta para nova decisão.",
      });
      setRevertOpen(false);
      await refetch();
    } catch (e: any) {
      toast({
        title: "Não foi possível reverter",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Destaques do Mês — Apuração
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Verifique votos, critérios de desempate e inelegibilidades antes de
            confirmar o vencedor.
          </p>
        </div>
        <div className="min-w-[220px]">
          <Select
            value={currentId ?? undefined}
            onValueChange={(v) => setSelectedId(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar prêmio" />
            </SelectTrigger>
            <SelectContent>
              {awards.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {MONTH_NAMES[a.reference_month - 1]}/{a.reference_year}
                  {a.published_at ? " · publicado" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedAward ? (
          <p className="text-sm text-muted-foreground">Nenhum prêmio encontrado.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase text-muted-foreground">
                  Total de votos
                </p>
                <p className="text-xl font-bold">{totalVotes}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase text-muted-foreground">
                  Elegíveis
                </p>
                <p className="text-xl font-bold flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {eligibleCount}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase text-muted-foreground">
                  Status
                </p>
                <p className="text-sm font-semibold">
                  {alreadyPublished
                    ? "Publicado"
                    : votingEnded
                      ? "Aguardando confirmação"
                      : "Votação em andamento"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-[11px] uppercase text-muted-foreground">
                  Encerramento
                </p>
                <p className="text-sm font-semibold">
                  {selectedAward.voting_end_at
                    ? new Date(selectedAward.voting_end_at).toLocaleString("pt-BR")
                    : "—"}
                </p>
              </div>
            </div>

            {detectedTie && !alreadyPublished && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 flex items-start gap-2 text-sm">
                <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">
                    Empate detectado após critérios automáticos
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Registre o motivo do desempate ao confirmar (pending_admin_decision).
                  </p>
                </div>
              </div>
            )}

            {alreadyPublished && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    Vencedor confirmado e publicado em{" "}
                    <strong>
                      {new Date(selectedAward.published_at!).toLocaleString("pt-BR")}
                    </strong>
                    .
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRevertOpen(true)}
                  disabled={isReverting}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reverter
                </Button>
              </div>
            )}

            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agente</TableHead>
                      <TableHead className="text-right">Votos</TableHead>
                      <TableHead className="text-right">Contrib.</TableHead>
                      <TableHead className="text-right">Dias ativos</TableHead>
                      <TableHead className="text-right">Respostas a 3º</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tally.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                          Nenhum indicado elegível neste prêmio.
                        </TableCell>
                      </TableRow>
                    )}
                    {tally.map((row, idx) => {
                      const disqualified = !row.eligible || row.disqualified_by_history;
                      const reason = reasonLabel(
                        row.history_reason ?? row.exclusion_reason,
                      );
                      return (
                        <TableRow key={row.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={row.avatar_url ?? undefined} />
                                <AvatarFallback>{initialsOf(row.name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm">
                                  {idx === 0 && !disqualified && (
                                    <Crown className="h-3.5 w-3.5 text-amber-500 inline mr-1" />
                                  )}
                                  {row.name ?? "Agente"}
                                </p>
                                {row.agency_name && (
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {row.agency_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {row.votes_count}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.contributions_count ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.active_days_count ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.third_party_replies_count ?? 0}
                          </TableCell>
                          <TableCell>
                            {disqualified ? (
                              <Badge variant="destructive" className="text-[10px]">
                                {reason ?? "Inelegível"}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                Elegível
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={idx === 0 ? "default" : "outline"}
                              disabled={
                                disqualified ||
                                !votingEnded ||
                                alreadyPublished ||
                                isConfirming
                              }
                              onClick={() =>
                                setConfirmTarget({
                                  userId: row.user_id,
                                  name: row.name ?? "Agente",
                                })
                              }
                            >
                              Confirmar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        <AlertDialog
          open={!!confirmTarget}
          onOpenChange={(o) => !o && !isConfirming && setConfirmTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar vencedor</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmTarget?.name} será registrado como Destaque do Mês. Esta
                ação publica imediatamente o resultado na página da comunidade e
                gera um registro imutável no histórico.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <label className="text-xs font-medium">
                Motivo do desempate (opcional)
              </label>
              <Textarea
                value={tieReason}
                onChange={(e) => setTieReason(e.target.value)}
                placeholder="Ex.: maior número de respostas a terceiros; empate resolvido por decisão administrativa."
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isConfirming}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} disabled={isConfirming}>
                {isConfirming ? "Confirmando..." : "Confirmar e publicar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={revertOpen} onOpenChange={setRevertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reverter confirmação?</AlertDialogTitle>
              <AlertDialogDescription>
                O registro no histórico será removido e a página voltará a exibir
                a apuração pendente. Use somente antes da divulgação oficial.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isReverting}>Manter</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevert} disabled={isReverting}>
                {isReverting ? "Revertendo..." : "Reverter"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}