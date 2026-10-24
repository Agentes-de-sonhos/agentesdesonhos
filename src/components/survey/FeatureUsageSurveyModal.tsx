import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isActiveImpersonatingUser } from "@/lib/impersonation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ClipboardList, FileText, Map, Wallet, Users, ShieldCheck, Filter, Workflow, BadgeDollarSign,
  Receipt, ArrowLeftRight, Globe, ShoppingBag, MessageSquareText, Sparkles, Palette, Zap, IdCard,
  GraduationCap, Hotel, MapPin, Stamp, Gift, Newspaper, Check, Clock, ArrowLeft, ArrowRight,
} from "lucide-react";

type Item = { key: string; label: string; hint?: string; icon: typeof FileText; highlight?: boolean };
type Step = { title: string; items: Item[] };

export const SURVEY_STEPS: Step[] = [
  { title: "Criação", items: [
    { key: "criacao_orcamento", label: "Criação de Orçamento", icon: FileText },
    { key: "criacao_roteiro", label: "Criação de Roteiro", icon: Map },
    { key: "carteira_digital", label: "Carteira Digital do Viajante", icon: Wallet },
  ]},
  { title: "Clientes & Operação", items: [
    { key: "gestao_clientes", label: "Gestão de Clientes", icon: Users },
    { key: "radar_documentos", label: "Radar de Validade de Documentos", hint: "Passaportes e vistos", icon: ShieldCheck, highlight: true },
    { key: "funil_oportunidades", label: "Funil de Oportunidades", icon: Filter },
    { key: "funil_operacoes", label: "Funil de Operações", icon: Workflow },
  ]},
  { title: "Gestão Financeira", items: [
    { key: "controle_comissoes", label: "Controle de Comissões", hint: "A receber e recebidas", icon: BadgeDollarSign },
    { key: "despesas_agencia", label: "Despesas da Agência", hint: "E contas a vencer", icon: Receipt },
    { key: "fluxo_caixa", label: "Fluxo de Caixa", hint: "Entradas e saídas", icon: ArrowLeftRight },
  ]},
  { title: "Marketing & Vendas", items: [
    { key: "paginas_vendas", label: "Páginas de Vendas", hint: "Landing pages", icon: Globe },
    { key: "vitrine_ofertas", label: "Vitrine de Ofertas", icon: ShoppingBag },
    { key: "formulario_captacao", label: "Formulário de Captação", hint: "Leads", icon: MessageSquareText },
    { key: "ia_legendas", label: "IA para Legendas, Stories e WhatsApp", icon: Sparkles },
    { key: "personalizador_laminas", label: "Personalizador de Lâminas", icon: Palette },
    { key: "acelerador_cadencia", label: "Acelerador de Cadência", icon: Zap },
    { key: "cartao_visitas", label: "Cartão de Visitas Digital", icon: IdCard },
  ]},
  { title: "Conhecimento & Pesquisa", items: [
    { key: "educatravel_academy", label: "EducaTravel Academy", hint: "Aulas e capacitação", icon: GraduationCap },
    { key: "raio_x_hotel", label: "Raio-X do Hotel", icon: Hotel },
    { key: "mapa_turismo", label: "Mapa do Turismo e Fornecedores", icon: MapPin },
    { key: "central_requisitos", label: "Central de Requisitos", hint: "Vacinas e vistos", icon: Stamp },
    { key: "beneficios_descontos", label: "Benefícios e Descontos", icon: Gift },
    { key: "noticias_trade", label: "Notícias do Trade", icon: Newspaper },
  ]},
];

const NONE = "__none__";

export function FeatureUsageSurveyModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Record<number, string[]>>({});
  const [suggestion, setSuggestion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || isActiveImpersonatingUser(user.id)) return;
    let cancelled = false;
    supabase.from("agent_feature_survey_responses").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => { if (!cancelled && !error && !data) setOpen(true); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const block = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener("keydown", block, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", block, true); document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !user) return null;

  const current = SURVEY_STEPS[step];
  const sel = picked[step] ?? [];
  const isLast = step === SURVEY_STEPS.length - 1;

  const toggle = (key: string) => {
    setPicked((p) => {
      const cur = (p[step] ?? []).filter((k) => k !== NONE);
      if (key === NONE) return { ...p, [step]: sel.includes(NONE) ? [] : [NONE] };
      return { ...p, [step]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });
  };

  const submit = async () => {
    setSaving(true);
    const selected = Object.values(picked).flat().filter((k) => k !== NONE);
    const { error } = await supabase.from("agent_feature_survey_responses").insert({
      user_id: user.id, selected_features: selected, suggestion: suggestion.trim().slice(0, 1000) || null,
    });
    setSaving(false);
    if (error && error.code !== "23505") { toast.error("Não foi possível enviar. Tente novamente."); return; }
    toast.success("Obrigado por responder!");
    setOpen(false);
  };

  const renderCard = (key: string, label: string, Icon: typeof FileText, hint?: string, highlight?: boolean) => {
    const on = sel.includes(key);
    return (
      <button key={key} type="button" onClick={() => toggle(key)} aria-pressed={on}
        className={`relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${on ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-muted/40 hover:border-primary/40"}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${on ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-background text-muted-foreground"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{label}</span>
          {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        </span>
        {highlight && !on && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">Destaque</span>}
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${on ? "border-primary bg-primary text-primary-foreground scale-110" : "border-muted-foreground/40"}`}>
          {on && <Check className="h-3 w-3" />}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/50 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-3 shadow-2xl">
        <div className="rounded-2xl border border-border p-5 sm:p-6">
          <div className="flex items-start gap-3 border-b border-border pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><ClipboardList className="h-5 w-5" /></span>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Pesquisa de uso da plataforma</h2>
              <p className="text-sm text-muted-foreground">Quais ferramentas você usa no seu dia a dia? Marque todas que utiliza.</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" /> Leva menos de 2 minutos para responder.
          </div>

          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
              <span>Etapa {step + 1} de {SURVEY_STEPS.length}</span><span className="text-foreground">{current.title}</span>
            </div>
            <div className="flex gap-1.5">
              {SURVEY_STEPS.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />)}
            </div>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {current.items.map((it) => renderCard(it.key, it.label, it.icon, it.hint, it.highlight))}
          </div>
          <button type="button" onClick={() => toggle(NONE)}
            className={`mt-3 text-xs underline-offset-2 hover:underline ${sel.includes(NONE) ? "font-semibold text-primary" : "text-muted-foreground"}`}>
            {sel.includes(NONE) ? "✓ " : ""}Não utilizo nenhuma destas ainda
          </button>

          {isLast && (
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Qual funcionalidade você sente falta ou gostaria de ver melhorada? <span className="font-normal text-muted-foreground">(opcional)</span></label>
              <Textarea value={suggestion} onChange={(e) => setSuggestion(e.target.value)} maxLength={1000} rows={3} className="border-0 bg-muted" />
            </div>
          )}

          <div className="mt-6 flex justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className={step === 0 ? "invisible" : ""}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
            <Button disabled={sel.length === 0 || saving} onClick={() => (isLast ? submit() : setStep((s) => s + 1))}>
              {isLast ? (saving ? "Enviando..." : <><Check className="mr-1 h-4 w-4" /> Concluir</>) : <>Avançar <ArrowRight className="ml-1 h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
