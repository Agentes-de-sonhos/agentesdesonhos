import { useState } from "react";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useLeadCapture, LeadCapture } from "@/hooks/useLeadCapture";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  ExternalLink,
  Eye,
  Trash2,
  Users,
  MessageCircle,
  Search,
  Link2,
  Bell,
  MapPin,
  Calendar,
  DollarSign,
  Phone,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-blue-100 text-blue-700" },
  em_contato: { label: "Em contato", color: "bg-yellow-100 text-yellow-700" },
  convertido: { label: "Convertido", color: "bg-green-100 text-green-700" },
  perdido: { label: "Perdido", color: "bg-red-100 text-red-700" },
};

function MeusLeadsContent() {
  const { form, leads, leadsLoading, unreadCount, markAsRead, updateStatus, deleteLead } = useLeadCapture();
  const [selectedLead, setSelectedLead] = useState<LeadCapture | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const formUrl = form?.token
    ? `${PUBLIC_DOMAIN}/formulario/${form.token}`
    : "";

  const copyLink = () => {
    if (formUrl) {
      navigator.clipboard.writeText(formUrl);
      toast.success("Link copiado!");
    }
  };

  const openLead = (lead: LeadCapture) => {
    setSelectedLead(lead);
    if (!lead.is_read) markAsRead(lead.id);
  };

  const openWhatsApp = (lead: LeadCapture) => {
    const phone = lead.lead_phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${lead.lead_name}! Recebi seu interesse em viagens. Vamos conversar? 😊`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const filteredLeads = leads?.filter((l) => {
    const matchSearch =
      l.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.lead_phone.includes(searchTerm);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="h-6 w-6 text-emerald-600" />
              Meus Leads
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white ml-2">
                  <Bell className="h-3 w-3 mr-1" />
                  {unreadCount} novo{unreadCount > 1 ? "s" : ""}
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os leads captados pelo seu formulário conversacional
            </p>
          </div>
        </div>

        {/* Share Link Card */}
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link2 className="h-5 w-5 text-emerald-600 shrink-0 mt-1 sm:mt-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-800 mb-1">
                  Seu link de captação de leads
                </p>
                <p className="text-xs text-emerald-600 truncate font-mono">{formUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyLink} className="border-emerald-300">
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(formUrl, "_blank")}
                  className="border-emerald-300"
                >
                  <ExternalLink className="h-4 w-4 mr-1" /> Abrir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, destino ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="em_contato">Em contato</SelectItem>
              <SelectItem value="convertido">Convertido</SelectItem>
              <SelectItem value="perdido">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads List */}
        {leadsLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : !filteredLeads?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-medium text-muted-foreground">Nenhum lead ainda</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Compartilhe seu link para começar a receber leads!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredLeads.map((lead) => {
              const st = STATUS_MAP[lead.status] || STATUS_MAP.novo;
              return (
                <Card
                  key={lead.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !lead.is_read ? "border-l-4 border-l-emerald-500 bg-emerald-50/30" : ""
                  }`}
                  onClick={() => openLead(lead)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">{lead.lead_name}</span>
                          <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                          {!lead.is_read && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
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
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[#25D366] border-[#25D366] hover:bg-[#25D366]/10"
                          onClick={() => openWhatsApp(lead)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openLead(lead)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Lead Detail Dialog */}
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {selectedLead && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-emerald-600" />
                    {selectedLead.lead_name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Status selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Status:</span>
                    <Select
                      value={selectedLead.status}
                      onValueChange={(v) => {
                        updateStatus({ leadId: selectedLead.id, status: v });
                        setSelectedLead({ ...selectedLead, status: v });
                      }}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="em_contato">Em contato</SelectItem>
                        <SelectItem value="convertido">Convertido</SelectItem>
                        <SelectItem value="perdido">Perdido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lead info */}
                  <div className="grid gap-3 text-sm">
                    <InfoRow icon={<Phone className="h-4 w-4" />} label="WhatsApp" value={selectedLead.lead_phone} />
                    <InfoRow icon={<MapPin className="h-4 w-4" />} label="Destino" value={selectedLead.destination} />
                    <InfoRow icon={<Calendar className="h-4 w-4" />} label="Datas" value={selectedLead.travel_dates} />
                    <InfoRow icon={<Users className="h-4 w-4" />} label="Viajantes" value={selectedLead.travelers_count} />
                    <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Orçamento" value={selectedLead.budget} />
                  </div>

                  {selectedLead.additional_info && (
                    <div>
                      <p className="text-sm font-medium mb-1 text-muted-foreground">Observações:</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedLead.additional_info}</p>
                    </div>
                  )}

                  {selectedLead.ai_suggestion && (
                    <div>
                      <p className="text-sm font-medium mb-1 text-emerald-700">💡 Sugestão da IA:</p>
                      <p className="text-sm bg-emerald-50 p-3 rounded-lg text-emerald-800">
                        {selectedLead.ai_suggestion}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Recebido em {format(new Date(selectedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white"
                      onClick={() => openWhatsApp(selectedLead)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Falar no WhatsApp
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        deleteLead(selectedLead.id);
                        setSelectedLead(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

export default function MeusLeads() {
  return (
    <SubscriptionGuard feature="lead_capture">
      <MeusLeadsContent />
    </SubscriptionGuard>
  );
}
