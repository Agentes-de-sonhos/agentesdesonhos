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
  GraduationCap, Hotel, MapPin, Stamp, Gift, Newspaper, Check, Clock, ArrowLeft, ArrowRight, Ban,
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
    { key: "radar_documentos", label: "Radar de Validade de Documentos", hint: "Passaportes e vistos", icon: ShieldCheck },
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

export function FeatureUsageSurveyModal({ preview = false }: { preview?: boolean } = {}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(preview);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Record<number, string[]>>({});
  const [suggestion, setSuggestion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preview || !user || isActiveImpersonatingUser(user.id)) return;
    let cancelled = false;
    supabase.from("agent_feature_survey_responses").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => { if (!cancelled && !error && !data) setOpen(true); });
    return () => { cancelled = true; };
  }, [user, preview]);

  useEffect(() => {
    if (!open) return;
    const block = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener("keydown", block, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", block, true); document.body.style.overflow = prev; };
  }, [open]);

  if (!open || (!user && !preview)) return null;

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
    if (preview || !user) {
      toast.success("Prévia concluída — nenhuma resposta foi gravada.");
      setStep(0); setPicked({}); setSuggestion("");
      return;
    }
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

  const renderCard = (key: string, label: string, Icon: typeof FileText, hint?: string) => {
    const on = sel.includes(key);
    return (
      <button key={key} type="button" onClick={() => toggle(key)} aria-pressed={on}
        className={`relative flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${on ? "border-primary bg-primary/10" : "border-transparent bg-card hover:border-primary/30"}`}>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{label}</span>
          {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        </span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${on ? "border-primary bg-primary text-primary-foreground scale-110" : "border-primary/30 bg-background"}`}>
          {on && <Check className="h-3.5 w-3.5" />}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/50 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-background shadow-2xl">
        <div className="rounded-t-3xl bg-gradient-to-br from-primary to-primary/70 px-6 pb-6 pt-5 text-primary-foreground">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/20"><ClipboardList className="h-4 w-4" /></span>
            <h2 className="text-sm font-bold uppercase tracking-widest">Enquete</h2>
          </div>
          <p className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">Quais ferramentas você usa no seu dia a dia?</p>
          <p className="mt-1 text-base font-medium opacity-90">Marque todas que utiliza.</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-medium">
            <Clock className="h-3.5 w-3.5" /> Leva menos de 2 minutos para responder
          </div>
        </div>

        <div className="bg-muted p-5 sm:p-6">
          <div>
            <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
              <span>Etapa {step + 1} de {SURVEY_STEPS.length}</span><span className="font-semibold text-primary">{current.title}</span>
            </div>
            <div className="flex gap-1.5">
              {SURVEY_STEPS.map((_, i) => <span key={i} className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-primary/15"}`} />)}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {current.items.map((it) => renderCard(it.key, it.label, it.icon, it.hint))}
            {renderCard(NONE, "Não utilizo nenhuma delas", Ban)}
          </div>

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
