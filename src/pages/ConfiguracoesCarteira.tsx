import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Wallet,
  Calendar as CalendarIcon,
  Plane,
  MapPin,
  Wrench,
  UserRound,
  MessageCircle,
  RotateCcw,
  Save,
  Loader2,
  Lock,
  Download,
  FileText,
} from "lucide-react";
import { useAgencyWalletSettings } from "@/hooks/useAgencyWalletSettings";
import { DEFAULT_WALLET_SETTINGS, WALLET_MODULES, AgencyWalletSettings } from "@/lib/walletSettings";
import { useToast } from "@/hooks/use-toast";

const MODULE_ICONS: Record<keyof AgencyWalletSettings, any> = {
  show_calendar: CalendarIcon,
  show_next_service: Plane,
  show_next_activity: MapPin,
  show_support_tools: Wrench,
  show_signature: UserRound,
  show_whatsapp: MessageCircle,
};

export default function ConfiguracoesCarteira() {
  const { settings, save, loading, saving } = useAgencyWalletSettings();
  const [draft, setDraft] = useState<AgencyWalletSettings>(settings);
  const { toast } = useToast();

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const toggle = (key: keyof AgencyWalletSettings) =>
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    try {
      await save(draft);
      toast({ title: "Configurações salvas", description: "Atualizadas para todas as carteiras." });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    }
  };

  const handleRestore = async () => {
    setDraft({ ...DEFAULT_WALLET_SETTINGS });
    try {
      await save({ ...DEFAULT_WALLET_SETTINGS });
      toast({ title: "Padrão restaurado", description: "Todos os módulos foram reativados." });
    } catch (e: any) {
      toast({ title: "Erro ao restaurar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Configurações da Carteira Digital
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Personalize quais módulos serão exibidos para seus passageiros na Carteira Digital
              Pública. As alterações valem para todas as carteiras da sua agência — novas e existentes.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={loading || saving}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar padrão
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restaurar padrão recomendado?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos os módulos opcionais serão reativados na configuração padrão. Essa ação
                    afeta imediatamente todas as carteiras da sua agência.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestore}>Restaurar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSave} disabled={!dirty || saving || loading}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar alterações
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Módulos da Carteira Digital</CardTitle>
              <CardDescription>
                Escolha quais recursos serão exibidos para seus passageiros na Carteira Digital Pública.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                WALLET_MODULES.map(({ key, label, description }) => {
                  const Icon = MODULE_ICONS[key];
                  return (
                    <label
                      key={key}
                      htmlFor={`toggle-${key}`}
                      className="flex items-start gap-4 rounded-xl border bg-card p-4 hover:bg-accent/40 cursor-pointer transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                      </div>
                      <Switch
                        id={`toggle-${key}`}
                        checked={draft[key]}
                        onCheckedChange={() => toggle(key)}
                        aria-label={label}
                      />
                    </label>
                  );
                })
              )}

              <Separator className="my-2" />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Recursos obrigatórios
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Navegação rápida (todas as categorias)</li>
                  <li>• Serviços da viagem</li>
                  <li>• Botão Baixar PDF</li>
                </ul>
                <p className="text-xs text-muted-foreground italic">
                  Esses recursos são essenciais e não podem ser desativados.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pré-visualização
            </p>
            <WalletPreview settings={draft} />
            <p className="text-xs text-muted-foreground text-center">
              Representação simplificada da carteira pública.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function WalletPreview({ settings }: { settings: AgencyWalletSettings }) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b bg-white/90 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/20" />
          <div className="h-2.5 w-20 bg-slate-200 rounded" />
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-[10px] text-slate-600">
          <FileText className="h-3 w-3" /> PDF
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Quick nav (always) */}
        <PreviewBlock label="Navegação rápida" required>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-slate-100" />
            ))}
          </div>
        </PreviewBlock>

        {settings.show_calendar && (
          <PreviewBlock label="Calendário da viagem">
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="h-5 rounded bg-slate-100" />
              ))}
            </div>
          </PreviewBlock>
        )}

        {settings.show_next_service && (
          <PreviewBlock label="Próximo serviço">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4 text-primary" />
              <div className="flex-1 space-y-1">
                <div className="h-2 w-24 bg-slate-200 rounded" />
                <div className="h-2 w-16 bg-slate-100 rounded" />
              </div>
            </div>
          </PreviewBlock>
        )}

        {settings.show_next_activity && (
          <PreviewBlock label="Próxima atividade">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <div className="flex-1 space-y-1">
                <div className="h-2 w-28 bg-slate-200 rounded" />
                <div className="h-2 w-20 bg-slate-100 rounded" />
              </div>
            </div>
          </PreviewBlock>
        )}

        {settings.show_support_tools && (
          <PreviewBlock label="Ferramentas de apoio">
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 rounded bg-slate-100" />
              ))}
            </div>
          </PreviewBlock>
        )}

        {/* Serviços (always) */}
        <PreviewBlock label="Serviços da viagem" required>
          <div className="space-y-1">
            <div className="h-6 rounded bg-slate-100" />
            <div className="h-6 rounded bg-slate-100" />
          </div>
        </PreviewBlock>

        {(settings.show_signature || settings.show_whatsapp) && (
          <PreviewBlock label="Atendimento">
            <div className="flex items-center gap-2">
              {settings.show_signature && (
                <>
                  <div className="h-8 w-8 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 w-20 bg-slate-200 rounded" />
                    <div className="h-2 w-14 bg-slate-100 rounded" />
                  </div>
                </>
              )}
              {!settings.show_signature && <div className="flex-1" />}
              {settings.show_whatsapp && (
                <div className="inline-flex items-center gap-1 rounded-full bg-[#25D366] text-white px-2 py-1 text-[10px] font-semibold">
                  <MessageCircle className="h-3 w-3" /> WhatsApp
                </div>
              )}
            </div>
          </PreviewBlock>
        )}
      </div>
    </div>
  );
}

function PreviewBlock({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {required && (
          <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
            <Lock className="h-2.5 w-2.5" /> obrigatório
          </span>
        )}
      </div>
      {children}
    </div>
  );
}