import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lock, ExternalLink, Copy, Eye, EyeOff, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { buildRoteiroLink } from "@/lib/roteiro-domain";
import { buildOrcamentoLink } from "@/lib/orcamento-domain";
import { buildCarteiraLink } from "@/lib/carteira-domain";

const ACCESS_PASSWORD = "@Univers44l!";

type TripRow = {
  id: string; user_id: string; client_name: string; trip_title: string | null;
  destination: string; start_date: string; end_date: string; status: string;
  public_access_code: string | null; access_password: string | null;
  is_locked: boolean; created_at: string; updated_at: string;
  owner_name: string | null; owner_agency: string | null;
};
type QuoteRow = {
  id: string; user_id: string; client_name: string; destination: string;
  start_date: string; end_date: string; status: string; public_access_code: string | null;
  total_amount: number; currency: string; created_at: string; updated_at: string;
  owner_name: string | null; owner_agency: string | null;
};
type ItineraryRow = {
  id: string; user_id: string; destination: string; start_date: string;
  end_date: string; status: string; public_access_code: string | null;
  travelers_count: number; trip_type: string; created_at: string; updated_at: string;
  owner_name: string | null; owner_agency: string | null;
};

function copy(text: string, label = "Copiado") {
  navigator.clipboard.writeText(text);
  toast.success(label);
}

function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("pt-BR");
}

function matches(q: string, ...fields: (string | null | undefined)[]) {
  if (!q) return true;
  const lower = q.toLowerCase();
  return fields.some((f) => (f || "").toLowerCase().includes(lower));
}

export function AdminUserProjectsManager() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-user-projects"],
    enabled: unlocked,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_user_projects");
      if (error) throw error;
      return data as { trips: TripRow[]; quotes: QuoteRow[]; itineraries: ItineraryRow[] };
    },
  });

  const trips = useMemo(
    () => (data?.trips || []).filter((t) =>
      matches(search, t.client_name, t.trip_title, t.destination, t.owner_name, t.owner_agency, t.public_access_code)
    ),
    [data, search]
  );
  const quotes = useMemo(
    () => (data?.quotes || []).filter((q) =>
      matches(search, q.client_name, q.destination, q.owner_name, q.owner_agency, q.public_access_code)
    ),
    [data, search]
  );
  const itineraries = useMemo(
    () => (data?.itineraries || []).filter((i) =>
      matches(search, i.destination, i.owner_name, i.owner_agency, i.public_access_code, i.trip_type)
    ),
    [data, search]
  );

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 max-w-md w-full space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-destructive/10 rounded-full">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold">Área Restrita</h2>
              <p className="text-sm text-muted-foreground">Informe a senha para visualizar os projetos dos usuários.</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pwd === ACCESS_PASSWORD) {
                setUnlocked(true);
              } else {
                toast.error("Senha incorreta");
                setPwd("");
              }
            }}
            className="space-y-3"
          >
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Senha de acesso"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full gap-2">
              <Lock className="h-4 w-4" /> Desbloquear
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, destino, agência, código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="secondary">
            {(data?.trips.length || 0) + (data?.quotes.length || 0) + (data?.itineraries.length || 0)} projetos
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            Atualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setUnlocked(false)}>
            Bloquear
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-destructive/40 text-destructive text-sm">
          Erro ao carregar: {(error as Error).message}
        </Card>
      )}

      <Tabs defaultValue="trips">
        <TabsList>
          <TabsTrigger value="trips">
            Carteiras Digitais ({trips.length})
          </TabsTrigger>
          <TabsTrigger value="quotes">
            Orçamentos ({quotes.length})
          </TabsTrigger>
          <TabsTrigger value="itineraries">
            Roteiros ({itineraries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trips">
          <Card className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente / Título</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Datas</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Senha</TableHead>
                  <TableHead>Link Público</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && trips.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma carteira encontrada</TableCell></TableRow>
                )}
                {trips.map((t) => {
                  const link = t.public_access_code && t.owner_agency
                    ? buildCarteiraLink(t.owner_agency, t.public_access_code)
                    : null;
                  const shown = revealed[`t-${t.id}`];
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.client_name}</div>
                        {t.trip_title && <div className="text-xs text-muted-foreground">{t.trip_title}</div>}
                      </TableCell>
                      <TableCell>{t.destination}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(t.start_date)} → {fmtDate(t.end_date)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{t.owner_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{t.owner_agency || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.is_locked ? "destructive" : "secondary"}>{t.is_locked ? "bloqueada" : t.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {t.access_password ? (
                          <div className="flex items-center gap-1">
                            <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                              {shown ? t.access_password : "••••••"}
                            </code>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setRevealed((r) => ({ ...r, [`t-${t.id}`]: !shown }))}>
                              {shown ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(t.access_password!, "Senha copiada")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">sem senha</span>}
                      </TableCell>
                      <TableCell>
                        {link ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(link, "Link copiado")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Datas</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Link Público</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && quotes.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum orçamento encontrado</TableCell></TableRow>
                )}
                {quotes.map((q) => {
                  const link = q.public_access_code && q.owner_agency
                    ? buildOrcamentoLink(q.owner_agency, q.public_access_code)
                    : null;
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.client_name}</TableCell>
                      <TableCell>{q.destination}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(q.start_date)} → {fmtDate(q.end_date)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{q.owner_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{q.owner_agency || "—"}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {q.currency} {Number(q.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{q.status}</Badge></TableCell>
                      <TableCell>
                        {link ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(link, "Link copiado")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="itineraries">
          <Card className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destino</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Datas</TableHead>
                  <TableHead>Pax</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Link Público</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && itineraries.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum roteiro encontrado</TableCell></TableRow>
                )}
                {itineraries.map((i) => {
                  const link = i.public_access_code && i.owner_agency
                    ? buildRoteiroLink(i.owner_agency, i.public_access_code)
                    : null;
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.destination}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{i.trip_type}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(i.start_date)} → {fmtDate(i.end_date)}
                      </TableCell>
                      <TableCell>{i.travelers_count}</TableCell>
                      <TableCell>
                        <div className="text-sm">{i.owner_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{i.owner_agency || "—"}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{i.status}</Badge></TableCell>
                      <TableCell>
                        {link ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(link, "Link copiado")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}