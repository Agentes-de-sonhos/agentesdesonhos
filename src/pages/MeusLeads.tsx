import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  ExternalLink,
  Eye,
  FlaskConical,
  Inbox,
  Link2,
  Loader2,
  MessageCircle,
  Save,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { describeOfficeHours, type OfficeHours } from "@/lib/officeHours";
import {
  DEFAULT_BRAND_COLOR,
  DEFAULT_CLOSING_MESSAGE,
  DEFAULT_WELCOME_MESSAGE,
  officeHoursOf,
  type LeadFormSettings,
} from "@/lib/leadFormConfig";
import { useLeadFormSettings } from "@/hooks/useLeadFormSettings";
import { LeadFormOfficeHoursEditor } from "@/components/leads/LeadFormOfficeHoursEditor";
import { LeadFormNotificationsSection } from "@/components/leads/LeadFormNotificationsSection";

type Draft = Pick<
  LeadFormSettings,
  | "is_active"
  | "headline"
  | "welcome_message"
  | "closing_message"
  | "brand_color"
  | "agency_name_override"
  | "logo_url_override"
  | "consultant_name_override"
  | "consultant_role_override"
  | "consultant_photo_url_override"
  | "whatsapp_override"
  | "timezone"
  | "ask_email"
  | "require_email"
  | "ask_dates"
  | "ask_travelers"
  | "ask_budget"
  | "ai_enabled"
  | "privacy_url"
  | "terms_url"
> & { office_hours: OfficeHours };

function toDraft(form: LeadFormSettings): Draft {
  return {
    is_active: form.is_active !== false,
    headline: form.headline ?? "",
    welcome_message: form.welcome_message ?? DEFAULT_WELCOME_MESSAGE,
    closing_message: form.closing_message ?? DEFAULT_CLOSING_MESSAGE,
    brand_color: form.brand_color ?? DEFAULT_BRAND_COLOR,
    agency_name_override: form.agency_name_override ?? "",
    logo_url_override: form.logo_url_override ?? "",
    consultant_name_override: form.consultant_name_override ?? "",
    consultant_role_override: form.consultant_role_override ?? "",
    consultant_photo_url_override: form.consultant_photo_url_override ?? "",
    whatsapp_override: form.whatsapp_override ?? "",
    timezone: form.timezone ?? "America/Sao_Paulo",
    office_hours: officeHoursOf(form.office_hours),
    ask_email: form.ask_email !== false,
    require_email: form.require_email === true,
    ask_dates: form.ask_dates !== false,
    ask_travelers: form.ask_travelers !== false,
    ask_budget: form.ask_budget !== false,
    ai_enabled: form.ai_enabled !== false,
    privacy_url: form.privacy_url ?? "",
    terms_url: form.terms_url ?? "",
  };
}

function MeusLeadsContent() {
  const { form, isLoading, update } = useLeadFormSettings();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (form && !draft) setDraft(toDraft(form));
  }, [form, draft]);

  const formUrl = form?.token ? `${PUBLIC_DOMAIN}/formulario/${form.token}` : "";
  const dirty = useMemo(() => {
    if (!form || !draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(toDraft(form));
  }, [form, draft]);

  const patch = (p: Partial<Draft>) => setDraft((prev) => (prev ? { ...prev, ...p } : prev));

  const save = () => {
    if (!draft) return;
    update.mutate({
      ...draft,
      headline: draft.headline?.trim() || null,
      agency_name_override: draft.agency_name_override?.trim() || null,
      logo_url_override: draft.logo_url_override?.trim() || null,
      consultant_name_override: draft.consultant_name_override?.trim() || null,
      consultant_role_override: draft.consultant_role_override?.trim() || null,
      consultant_photo_url_override: draft.consultant_photo_url_override?.trim() || null,
      whatsapp_override: draft.whatsapp_override?.replace(/\D/g, "") || null,
      privacy_url: draft.privacy_url?.trim() || null,
      terms_url: draft.terms_url?.trim() || null,
      hours_confirmed: true,
      office_hours: draft.office_hours as unknown as LeadFormSettings["office_hours"],
    });
  };

  const startTestMode = () => {
    const until = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    update.mutate({ test_mode_until: until });
    if (formUrl) window.open(formUrl, "_blank");
  };

  if (isLoading || !draft || !form) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const conversion = form.views_count > 0 ? Math.round((form.leads_count / form.views_count) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-emerald-600" />
              Formulário Conversacional
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure, teste e divulgue seu canal de captação de leads.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={draft.is_active} onCheckedChange={(on) => patch({ is_active: on })} />
              <span className="text-sm">{draft.is_active ? "Publicado" : "Rascunho"}</span>
            </div>
            <Button onClick={save} disabled={!dirty || update.isPending}>
              {update.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xl font-semibold">{form.views_count}</p>
                <p className="text-xs text-muted-foreground">Visitas ao formulário</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-xl font-semibold">{form.leads_count}</p>
                <p className="text-xs text-muted-foreground">Leads recebidos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <Inbox className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xl font-semibold">{conversion}%</p>
                <p className="text-xs text-muted-foreground">Conversão</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="share">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="share">Compartilhar</TabsTrigger>
            <TabsTrigger value="identity">Aparência</TabsTrigger>
            <TabsTrigger value="questions">Perguntas</TabsTrigger>
            <TabsTrigger value="hours">Horários</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
          </TabsList>

          {/* Share */}
          <TabsContent value="share" className="space-y-4 pt-4">
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Link2 className="h-5 w-5 text-emerald-600 shrink-0 mt-1 sm:mt-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-800 mb-1">Seu link de captação</p>
                    <p className="text-xs text-emerald-700 truncate font-mono">{formUrl}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300"
                      onClick={() => {
                        navigator.clipboard.writeText(formUrl);
                        toast.success("Link copiado!");
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copiar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-300"
                      onClick={() => window.open(formUrl, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" /> Abrir
                    </Button>
                  </div>
                </div>
                {formUrl && (
                  <div className="flex items-center gap-4 pt-2 border-t border-emerald-200">
                    <QRCodeCanvas value={formUrl} size={96} includeMargin />
                    <p className="text-xs text-emerald-700">
                      Use o QR Code em cartões, vitrines e apresentações. Ele aponta para o mesmo link público.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <FlaskConical className="h-5 w-5 text-amber-600" />
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium">Testar sem publicar</p>
                  <p className="text-xs text-muted-foreground">
                    Libera o link por 2 horas mesmo em rascunho. Envios de teste não contam nas métricas nem criam
                    oportunidades no CRM.
                  </p>
                </div>
                {form.test_mode_until && new Date(form.test_mode_until) > new Date() && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    Teste ativo
                  </Badge>
                )}
                <Button size="sm" variant="outline" onClick={startTestMode} disabled={update.isPending}>
                  Abrir em modo de teste
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardContent className="p-4 flex items-center gap-3">
                <Inbox className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Leads recebidos</p>
                  <p className="text-xs text-muted-foreground">
                    Todos os contatos aparecem na tela de Captação de Leads, junto com as demais origens.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/meus-leads")}>
                  Ver leads
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Identity */}
          <TabsContent value="identity" className="space-y-4 pt-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título exibido no topo</Label>
                    <Input
                      value={draft.headline ?? ""}
                      onChange={(e) => patch({ headline: e.target.value })}
                      placeholder="Ex.: Planeje sua próxima viagem"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome da agência (opcional)</Label>
                    <Input
                      value={draft.agency_name_override ?? ""}
                      onChange={(e) => patch({ agency_name_override: e.target.value })}
                      placeholder="Usa o nome do seu perfil se vazio"
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Consultor(a) responsável</Label>
                    <Input
                      value={draft.consultant_name_override ?? ""}
                      onChange={(e) => patch({ consultant_name_override: e.target.value })}
                      placeholder="Usa seu nome se vazio"
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cargo exibido</Label>
                    <Input
                      value={draft.consultant_role_override ?? ""}
                      onChange={(e) => patch({ consultant_role_override: e.target.value })}
                      placeholder="Consultor(a) de viagens"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">WhatsApp de atendimento</Label>
                    <Input
                      value={draft.whatsapp_override ?? ""}
                      onChange={(e) => patch({ whatsapp_override: e.target.value })}
                      placeholder="Usa o telefone do perfil se vazio"
                      inputMode="tel"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cor principal</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={draft.brand_color || DEFAULT_BRAND_COLOR}
                        onChange={(e) => patch({ brand_color: e.target.value })}
                        className="w-16 p-1 h-10"
                      />
                      <Input
                        value={draft.brand_color ?? ""}
                        onChange={(e) => patch({ brand_color: e.target.value })}
                        maxLength={9}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">URL do logo (opcional)</Label>
                    <Input
                      value={draft.logo_url_override ?? ""}
                      onChange={(e) => patch({ logo_url_override: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">URL da sua foto (opcional)</Label>
                    <Input
                      value={draft.consultant_photo_url_override ?? ""}
                      onChange={(e) => patch({ consultant_photo_url_override: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Mensagem de boas-vindas</Label>
                  <Textarea
                    value={draft.welcome_message ?? ""}
                    onChange={(e) => patch({ welcome_message: e.target.value })}
                    rows={2}
                    maxLength={400}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mensagem final (após o envio)</Label>
                  <Textarea
                    value={draft.closing_message ?? ""}
                    onChange={(e) => patch({ closing_message: e.target.value })}
                    rows={2}
                    maxLength={400}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Link da política de privacidade</Label>
                    <Input
                      value={draft.privacy_url ?? ""}
                      onChange={(e) => patch({ privacy_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Link dos termos de uso</Label>
                    <Input
                      value={draft.terms_url ?? ""}
                      onChange={(e) => patch({ terms_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions */}
          <TabsContent value="questions" className="space-y-3 pt-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Nome e WhatsApp são sempre solicitados. As demais perguntas podem ser desativadas para tornar a
                  conversa mais curta.
                </p>
                {[
                  { key: "ask_email" as const, label: "Pedir e-mail" },
                  { key: "ask_dates" as const, label: "Pedir período da viagem" },
                  { key: "ask_travelers" as const, label: "Pedir número de viajantes" },
                  { key: "ask_budget" as const, label: "Pedir orçamento aproximado" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm">{item.label}</span>
                    <Switch
                      checked={draft[item.key] === true}
                      onCheckedChange={(on) => patch({ [item.key]: on } as Partial<Draft>)}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 pt-2 border-t">
                  <div>
                    <p className="text-sm">E-mail obrigatório</p>
                    <p className="text-xs text-muted-foreground">
                      Só faz sentido quando a pergunta de e-mail está ativa.
                    </p>
                  </div>
                  <Switch
                    checked={draft.require_email}
                    disabled={!draft.ask_email}
                    onCheckedChange={(on) => patch({ require_email: on })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t">
                  <div>
                    <p className="text-sm">Resumo e sugestão com IA</p>
                    <p className="text-xs text-muted-foreground">
                      Gera um resumo do lead e uma mensagem pronta de WhatsApp. Se a IA falhar, o lead é salvo
                      normalmente.
                    </p>
                  </div>
                  <Switch checked={draft.ai_enabled} onCheckedChange={(on) => patch({ ai_enabled: on })} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hours */}
          <TabsContent value="hours" className="space-y-4 pt-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fuso horário</Label>
                  <Input
                    value={draft.timezone}
                    onChange={(e) => patch({ timezone: e.target.value })}
                    placeholder="America/Sao_Paulo"
                  />
                  <p className="text-xs text-muted-foreground">
                    O horário é sempre avaliado no servidor, nunca no relógio do visitante.
                  </p>
                </div>
                <LeadFormOfficeHoursEditor
                  value={draft.office_hours}
                  onChange={(next) => patch({ office_hours: next })}
                />
                <p className="text-xs text-muted-foreground">{describeOfficeHours(draft.office_hours)}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="pt-4">
            <LeadFormNotificationsSection formId={form.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default function MeusLeads() {
  return (
    <SubscriptionGuard feature="lead_capture">
      <MeusLeadsContent />
    </SubscriptionGuard>
  );
}
