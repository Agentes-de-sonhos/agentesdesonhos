import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Sparkles,
  Globe,
  ArrowRight,
  Search,
  Phone,
  MapPin,
  Calendar,
  Inbox,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAllLeads, LeadSource } from "@/hooks/useAllLeads";

export default function CaptacaoLeads() {
  const navigate = useNavigate();
  const { data: leads, isLoading } = useAllLeads();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (leads ?? []).filter((l) => {
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (!term) return true;
      return (
        l.lead_name.toLowerCase().includes(term) ||
        l.lead_phone.toLowerCase().includes(term) ||
        (l.destination ?? "").toLowerCase().includes(term) ||
        (l.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [leads, search, sourceFilter]);

  const openWhatsApp = (lead: { lead_name: string; lead_phone: string }) => {
    const phone = lead.lead_phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${lead.lead_name}! Recebi seu contato. Vamos conversar sobre sua viagem? 😊`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-5xl">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-pink-600" />
            Captação de Leads
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Escolha como quer captar seus próximos clientes.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Card 1: Conversacional */}
          <Card
            onClick={() => navigate("/meus-leads/conversacional")}
            className="cursor-pointer border-0 shadow-card hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-lg">Formulário Conversacional</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Capte leads através de uma conversa interativa e dinâmica, simulando um
                  atendimento via WhatsApp.
                </p>
              </div>
              <Button variant="ghost" className="text-emerald-700 hover:text-emerald-800 px-0">
                Acessar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Página de Vendas */}
          <Card
            onClick={() => navigate("/meus-leads/landings")}
            className="cursor-pointer border-0 shadow-card hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
                <Globe className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-lg">Página de Vendas Personalizada</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Crie páginas simples e diretas para captar leads promovendo um produto,
                  destino ou oferta específica.
                </p>
              </div>
              <Button variant="ghost" className="text-pink-700 hover:text-pink-800 px-0">
                Acessar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Leads Recebidos */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Inbox className="h-5 w-5 text-primary" />
                Leads Recebidos
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Todos os leads captados pelas suas origens em um só lugar.
              </p>
            </div>
            {leads && leads.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {filtered.length} de {leads.length}
              </Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone, destino ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filtrar origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="conversational">Formulário Conversacional</SelectItem>
                <SelectItem value="sales_landing">Página de Vendas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Carregando leads...
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-medium text-muted-foreground">
                  {leads?.length ? "Nenhum lead corresponde aos filtros" : "Nenhum lead recebido ainda"}
                </h3>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {leads?.length
                    ? "Ajuste a busca ou o filtro de origem."
                    : "Compartilhe seus links de captação para começar."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((lead) => {
                const isConv = lead.source === "conversational";
                const badgeClass = isConv
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                  : "bg-pink-100 text-pink-700 hover:bg-pink-100";
                const Icon = MessageCircle;
                return (
                  <Card key={`${lead.source}-${lead.id}`} className="hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-foreground">{lead.lead_name}</span>
                            <Badge className={`text-xs gap-1 ${badgeClass}`}>
                              <Icon className="h-3 w-3" />
                              {isConv ? "Formulário Conversacional" : "Página de Vendas"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.lead_phone}
                            </span>
                            {lead.destination && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {lead.destination}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[#25D366] border-[#25D366] hover:bg-[#25D366]/10"
                            onClick={() => openWhatsApp(lead)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}