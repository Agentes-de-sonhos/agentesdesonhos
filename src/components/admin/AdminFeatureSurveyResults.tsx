import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SURVEY_STEPS } from "@/components/survey/FeatureUsageSurveyModal";
import { Users, Trophy, TrendingDown, MessageCircle, Loader2 } from "lucide-react";

type Row = { user_id: string; selected_features: string[] | null; suggestion: string | null; completed_at: string };

export function AdminFeatureSurveyResults() {
  const [step, setStep] = useState<number | "all">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-feature-survey-results"],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("agent_feature_survey_responses" as any)
        .select("user_id, selected_features, suggestion, completed_at")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      const list = (rows ?? []) as unknown as Row[];
      const ids = [...new Set(list.map((r) => r.user_id))];
      const names: Record<string, { name: string; email: string }> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
        (profs as any[] | null)?.forEach((p) => (names[p.user_id] = { name: p.full_name ?? "", email: p.email ?? "" }));
      }
      return { list, names };
    },
  });

  const total = data?.list.length ?? 0;

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    data?.list.forEach((r) => (r.selected_features ?? []).forEach((k) => (c[k] = (c[k] ?? 0) + 1)));
    return c;
  }, [data]);

  const allItems = SURVEY_STEPS.flatMap((s, i) => s.items.map((it) => ({ ...it, stepIndex: i, count: counts[it.key] ?? 0 })));
  const ranked = [...allItems].sort((a, b) => b.count - a.count);
  const visible = step === "all" ? ranked : ranked.filter((i) => i.stepIndex === step);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const noneCount = (i: number) => counts[`__none__:${i}`] ?? counts[`__none__${i}`] ?? 0;

  const suggestions = (data?.list ?? []).filter((r) => r.suggestion?.trim());
  const filtered = suggestions.filter((r) => {
    const q = search.toLowerCase();
    const n = data?.names[r.user_id];
    return !q || r.suggestion!.toLowerCase().includes(q) || n?.name.toLowerCase().includes(q) || n?.email.toLowerCase().includes(q);
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const kpis = [
    { icon: Users, label: "Respostas", value: String(total) },
    { icon: Trophy, label: "Mais usada", value: total ? ranked[0]?.label : "—" },
    { icon: TrendingDown, label: "Menos usada", value: total ? ranked[ranked.length - 1]?.label : "—" },
    { icon: MessageCircle, label: "Com sugestão", value: `${pct(suggestions.length)}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-xl bg-primary/10 p-2.5"><k.icon className="h-5 w-5 text-primary" /></div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="truncate font-semibold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Ranking de ferramentas</CardTitle>
          <div className="flex flex-wrap gap-2">
            {[{ v: "all" as const, t: "Todas" }, ...SURVEY_STEPS.map((s, i) => ({ v: i, t: s.title }))].map((o) => (
              <button
                key={String(o.v)}
                onClick={() => setStep(o.v)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${step === o.v ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                {o.t}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {total === 0 && <p className="text-sm text-muted-foreground">Ainda não há respostas.</p>}
          {visible.map((it, idx) => (
            <div key={it.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-6 text-muted-foreground">{idx + 1}.</span>
                  <it.icon className="h-4 w-4 text-primary" />
                  {it.label}
                </span>
                <span className="font-medium">{pct(it.count)}% <span className="text-muted-foreground">({it.count})</span></span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct(it.count)}%` }} />
              </div>
            </div>
          ))}
          {step !== "all" && noneCount(step) > 0 && (
            <Badge variant="secondary">“Não utilizo nenhuma delas”: {noneCount(step)} ({pct(noneCount(step))}%)</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Sugestões ({suggestions.length})</CardTitle>
          <Input placeholder="Buscar por texto, nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma sugestão.</p>}
          {filtered.map((r) => {
            const n = data?.names[r.user_id];
            return (
              <div key={r.user_id} className="rounded-xl border p-3">
                <p className="whitespace-pre-wrap text-sm">{r.suggestion}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {n?.name || "Agente"} {n?.email && `· ${n.email}`} · {new Date(r.completed_at).toLocaleString("pt-BR")}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
