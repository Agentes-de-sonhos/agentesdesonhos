import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Search, Star } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOwnsAgencySite } from "@/hooks/useOwnsAgencySite";
import { BRAZIL_RESORTS } from "@/components/resorts-brasil/resortsData";
import { STATE_NAME, prettyName } from "@/components/resorts-brasil/BrazilResortsMap";
import { MAX_FEATURED, type ResortSetting } from "@/lib/resortCuration";
import { cn } from "@/lib/utils";

type Filter = "all" | "featured" | "hidden";

export default function ResortsCurationPanel() {
  const { data: owns, isLoading } = useOwnsAgencySite();
  if (isLoading) return <DashboardLayout><div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin" /></div></DashboardLayout>;
  if (!owns) return <Navigate to="/dashboard" replace />;
  return <DashboardLayout><Inner /></DashboardLayout>;
}

function Inner() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const key = ["resort-settings-admin", uid];
  const { data: rows = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("agency_resort_settings").select("resort_slug,is_featured,is_hidden,display_order").eq("user_id", uid);
      if (error) throw error;
      return data as ResortSetting[];
    },
  });
  const map = useMemo(() => new Map(rows.map((r) => [r.resort_slug, r])), [rows]);
  const [q, setQ] = useState("");
  const [uf, setUf] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const featuredCount = rows.filter((r) => r.is_featured && !r.is_hidden).length;
  const hiddenCount = rows.filter((r) => r.is_hidden).length;
  const ufs = useMemo(() => [...new Set(BRAZIL_RESORTS.map((r) => r.uf))].sort((a, b) => STATE_NAME[a].localeCompare(STATE_NAME[b])), []);

  const list = BRAZIL_RESORTS
    .filter((r) => !uf || r.uf === uf)
    .filter((r) => !q || prettyName(r.name).toLowerCase().includes(q.toLowerCase()))
    .filter((r) => filter === "all" || (filter === "featured" ? map.get(r.slug)?.is_featured : map.get(r.slug)?.is_hidden))
    .sort((a, b) => prettyName(a.name).localeCompare(prettyName(b.name)));

  const save = async (slug: string, patch: Partial<ResortSetting>) => {
    const cur = map.get(slug) ?? { resort_slug: slug, is_featured: false, is_hidden: false, display_order: null };
    const next = { ...cur, ...patch };
    if (next.is_featured && !next.is_hidden && !cur.is_featured && featuredCount >= MAX_FEATURED) {
      toast.error(`Você pode destacar até ${MAX_FEATURED} resorts.`);
      return;
    }
    if (next.is_hidden) next.is_featured = false;
    setBusy(slug);
    const { error } = await supabase.from("agency_resort_settings").upsert(
      { user_id: uid, resort_slug: slug, is_featured: next.is_featured, is_hidden: next.is_hidden, display_order: next.display_order, updated_at: new Date().toISOString() },
      { onConflict: "user_id,resort_slug" },
    );
    setBusy(null);
    if (error) return toast.error("Não foi possível salvar. Tente novamente.");
    qc.invalidateQueries({ queryKey: key });
    toast.success("Salvo");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Resorts no Brasil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha até {MAX_FEATURED} resorts em destaque para o seu site e oculte os que não quer apresentar. Sem destaques, o site mostra uma seleção variada de várias regiões.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["No catálogo", BRAZIL_RESORTS.length], ["Visíveis no site", BRAZIL_RESORTS.length - hiddenCount], ["Ocultos", hiddenCount], ["Destaques", `${featuredCount}/${MAX_FEATURED}`]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-xl font-semibold">{v}</p></div>
        ))}
      </div>
      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar resort" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={uf} onChange={(e) => setUf(e.target.value)} aria-label="Estado">
          <option value="">Todos os estados</option>
          {ufs.map((u) => <option key={u} value={u}>{STATE_NAME[u]}</option>)}
        </select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Situação">
          <option value="all">Todos</option><option value="featured">Destaques</option><option value="hidden">Ocultos</option>
        </select>
      </div>
      {isLoading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
        <ul className="divide-y rounded-xl border bg-card">
          {list.map((r) => {
            const s = map.get(r.slug);
            const hidden = !!s?.is_hidden;
            const featured = !!s?.is_featured && !hidden;
            return (
              <li key={r.slug} className={cn("flex items-center gap-3 px-4 py-3", hidden && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{prettyName(r.name)}</p>
                  <p className="text-xs text-muted-foreground">{STATE_NAME[r.uf]}</p>
                </div>
                {featured && <Badge>Destaque</Badge>}
                {hidden && <Badge variant="secondary">Oculto</Badge>}
                <Button size="icon" variant={featured ? "default" : "outline"} disabled={busy === r.slug || hidden} aria-label={featured ? "Remover destaque" : "Destacar"} title={featured ? "Remover destaque" : "Destacar no site"} onClick={() => save(r.slug, { is_featured: !featured })}>
                  <Star className={cn("h-4 w-4", featured && "fill-current")} />
                </Button>
                <Button size="icon" variant="outline" disabled={busy === r.slug} aria-label={hidden ? "Mostrar no site" : "Ocultar do site"} title={hidden ? "Mostrar no site" : "Ocultar do site"} onClick={() => save(r.slug, { is_hidden: !hidden })}>
                  {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </li>
            );
          })}
          {!list.length && <li className="p-8 text-center text-sm text-muted-foreground">Nenhum resort encontrado.</li>}
        </ul>
      )}
    </div>
  );
}
