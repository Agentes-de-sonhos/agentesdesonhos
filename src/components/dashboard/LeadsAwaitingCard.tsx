import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  ArrowRight,
  MessageCircle,
  Phone,
  MapPin,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useLeads, useMarkLeadAttended } from "@/hooks/useLeadAlerts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function LeadsAwaitingCard() {
  const navigate = useNavigate();
  const { data: leads = [], isLoading } = useLeads();
  const markAttended = useMarkLeadAttended();

  // Only show leads that are NOT read (novos)
  const novosLeads = leads.filter((l) => !l.is_read);

  // Hide entire section when there are no new leads
  if (!isLoading && novosLeads.length === 0) return null;

  const openWhatsApp = (lead: { lead_name: string; lead_phone: string }) => {
    const phone = lead.lead_phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${lead.lead_name}! Recebi seu contato. Vamos conversar sobre sua viagem? 😊`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleMarkAttended = async (lead: { id: string; source: string }) => {
    try {
      await markAttended.mutateAsync({ id: lead.id, source: lead.source as any });
      toast.success("Lead marcado como atendido");
    } catch {
      toast.error("Erro ao marcar como atendido");
    }
  };

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Inbox className="h-5 w-5 text-amber-600" />
              Leads aguardando atendimento
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-amber-600" />
          </div>
          <Badge className="bg-red-100 text-red-700 border border-red-200 animate-pulse">
            {novosLeads.length} {novosLeads.length === 1 ? "novo" : "novos"}
          </Badge>
        </div>

        <div className="space-y-2">
          {novosLeads.slice(0, 5).map((lead) => {
            const isConv = lead.source === "conversational";
            return (
              <div
                key={`${lead.source}-${lead.id}`}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {lead.lead_name}
                    </span>
                    <Badge
                      className={`text-[10px] gap-0.5 ${
                        isConv
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "bg-pink-100 text-pink-700 hover:bg-pink-100"
                      }`}
                    >
                      <MessageCircle className="h-2.5 w-2.5" />
                      {isConv ? "Conversacional" : "Página de Vendas"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {lead.lead_phone}
                    </span>
                    {lead.destination && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {lead.destination}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[#25D366] border-[#25D366] hover:bg-[#25D366]/10 h-8 px-2"
                    onClick={() => openWhatsApp(lead)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2"
                    onClick={() => handleMarkAttended(lead)}
                    disabled={markAttended.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {novosLeads.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{novosLeads.length - 5} lead{novosLeads.length - 5 === 1 ? "" : "s"} novo{novosLeads.length - 5 === 1 ? "" : "s"}
          </p>
        )}

        <Button
          variant="ghost"
          className="w-full text-amber-700 hover:text-amber-800 hover:bg-amber-600/5"
          onClick={() => navigate("/meus-leads")}
        >
          Abrir central de leads
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
