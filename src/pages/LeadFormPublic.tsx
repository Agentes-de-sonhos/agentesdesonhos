import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { describeOfficeHours } from "@/lib/officeHours";
import {
  buildLeadSummary,
  buildLeadWhatsappMessage,
  buildSteps,
  CONSENT_TEXT,
  CONSENT_VERSION,
  DEFAULT_BRAND_COLOR,
  DEFAULT_CLOSING_MESSAGE,
  DEFAULT_WELCOME_MESSAGE,
  officeHoursOf,
  validateStep,
  type LeadAnswers,
  type StepKey,
} from "@/lib/leadFormConfig";
import { usePublicLeadForm } from "@/hooks/usePublicLeadForm";

interface ChatMessage {
  id: string;
  type: "bot" | "user";
  text: string;
}

export default function LeadFormPublic() {
  const { token } = useParams<{ token: string }>();
  const { config, loading, loadError, isOpen, submit } = usePublicLeadForm(token);

  const steps = useMemo(() => (config ? buildSteps(config) : []), [config]);
  const brand = config?.brand_color?.trim() || DEFAULT_BRAND_COLOR;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [answers, setAnswers] = useState<LeadAnswers>({});
  const [consent, setConsent] = useState(false);
  const [askingConsent, setAskingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, askingConsent, done]);

  useEffect(() => {
    if (!config || bootstrapped.current || !steps.length) return;
    bootstrapped.current = true;
    setMessages([
      { id: "welcome", type: "bot", text: config.welcome_message || DEFAULT_WELCOME_MESSAGE },
      { id: "q0", type: "bot", text: steps[0].question },
    ]);
  }, [config, steps]);

  const step = steps[stepIndex];
  const progress = steps.length ? Math.round(((stepIndex + (askingConsent || done ? 1 : 0)) / steps.length) * 100) : 0;

  const answerKey = (key: StepKey): keyof LeadAnswers => key as keyof LeadAnswers;

  const pushMessages = (items: ChatMessage[]) => setMessages((prev) => [...prev, ...items]);

  const advance = (nextAnswers: LeadAnswers, shown: string) => {
    const nextIndex = stepIndex + 1;
    const items: ChatMessage[] = [{ id: `u-${stepIndex}-${Date.now()}`, type: "user", text: shown }];
    if (nextIndex < steps.length) {
      items.push({ id: `q${nextIndex}-${Date.now()}`, type: "bot", text: steps[nextIndex].question });
      setStepIndex(nextIndex);
    } else {
      items.push({
        id: `consent-${Date.now()}`,
        type: "bot",
        text: "Perfeito! Só preciso da sua autorização para guardar esses dados e entrar em contato. 🔒",
      });
      setAskingConsent(true);
    }
    setAnswers(nextAnswers);
    pushMessages(items);
  };

  const handleSend = () => {
    if (!step || submitting || askingConsent || done) return;
    const value = inputValue.trim();
    const error = validateStep(step.key, value, config?.require_email === true);
    if (error) {
      toast.error(error);
      return;
    }
    setInputValue("");
    advance({ ...answers, [answerKey(step.key)]: value }, value);
  };

  const handleSkip = () => {
    if (!step || !step.optional || submitting || askingConsent || done) return;
    setInputValue("");
    advance({ ...answers, [answerKey(step.key)]: "" }, "Prefiro não informar");
  };

  const handleBack = () => {
    if (submitting || done) return;
    if (askingConsent) {
      setAskingConsent(false);
      setMessages((prev) => prev.slice(0, -1));
      return;
    }
    if (stepIndex === 0) return;
    const prevIndex = stepIndex - 1;
    setStepIndex(prevIndex);
    setInputValue(String(answers[answerKey(steps[prevIndex].key)] ?? ""));
    setMessages((prev) => prev.slice(0, -2));
  };

  const handleSubmit = async () => {
    if (!consent) {
      toast.error("É necessário autorizar o contato para enviar.");
      return;
    }
    setSubmitting(true);

    const summary = buildLeadSummary(answers);
    let aiSuggestion = "";
    let aiSummary = "";
    let whatsappMessage = buildLeadWhatsappMessage(answers, config?.agency_name);

    if (config?.ai_enabled) {
      try {
        const { data } = await supabase.functions.invoke("lead-wizard-ai", {
          body: {
            type: "suggestion",
            data: {
              leadName: answers.name,
              destination: answers.destination,
              travelDates: answers.travel_dates,
              travelersCount: answers.travelers_count,
              budget: answers.budget,
              additionalInfo: answers.additional_info,
            },
            agentName: config.consultant_name,
          },
        });
        aiSuggestion = String(data?.suggestion ?? "").slice(0, 2000);
        aiSummary = String(data?.lead_summary ?? "").slice(0, 500);
        if (data?.whatsapp_message) whatsappMessage = String(data.whatsapp_message).slice(0, 2000);
      } catch {
        /* AI is a bonus: the lead is never lost because of it */
      }
    }

    const result = await submit({
      lead_name: answers.name,
      lead_phone: answers.phone,
      lead_email: answers.email || null,
      destination: answers.destination || null,
      travel_dates: answers.travel_dates || null,
      travelers_count: answers.travelers_count || null,
      budget: answers.budget || null,
      additional_info: answers.additional_info || null,
      lead_summary: aiSummary || summary,
      ai_suggestion: aiSuggestion || null,
      whatsapp_message: whatsappMessage,
      consent: true,
      consent_version: CONSENT_VERSION,
      honeypot,
    });

    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    setAskingConsent(false);
    setDone(true);
    pushMessages([
      {
        id: `done-${Date.now()}`,
        type: "bot",
        text: config?.closing_message || DEFAULT_CLOSING_MESSAGE,
      },
      ...(aiSuggestion ? [{ id: `ai-${Date.now()}`, type: "bot" as const, text: aiSuggestion }] : []),
    ]);
  };

  const whatsappHref = useMemo(() => {
    const digits = (config?.whatsapp ?? "").replace(/\D/g, "");
    if (!digits) return null;
    const phone = digits.startsWith("55") ? digits : `55${digits}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(buildLeadWhatsappMessage(answers, config?.agency_name))}`;
  }, [config, answers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      </div>
    );
  }

  if (loadError || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center space-y-3">
          <MessageCircle className="h-10 w-10 mx-auto text-slate-300" />
          <h1 className="text-lg font-semibold text-slate-800">Formulário indisponível</h1>
          <p className="text-sm text-slate-500">
            {loadError ?? "Este link não está mais ativo. Fale diretamente com sua agência."}
          </p>
        </div>
      </div>
    );
  }

  const hoursLabel = describeOfficeHours(officeHoursOf(config.office_hours));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {config.is_test && (
        <div className="bg-amber-100 text-amber-900 text-xs font-medium text-center py-2 px-4">
          Modo de teste — este envio não conta nas métricas nem cria oportunidades.
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {config.logo_url ? (
            <img
              src={config.logo_url}
              alt={config.agency_name ?? "Agência"}
              className="h-10 w-10 rounded-xl object-contain bg-white border"
              loading="lazy"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: brand }}
            >
              <MessageCircle className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-slate-900 truncate">
              {config.headline || config.agency_name || "Planeje sua viagem"}
            </h1>
            <p className="text-xs text-slate-500 truncate">
              {config.consultant_name ? `${config.consultant_name} • ` : ""}
              {isOpen ? "Online agora" : "Fora do horário de atendimento"}
            </p>
          </div>
        </div>
        <Progress value={done ? 100 : progress} className="h-1 rounded-none" />
      </header>

      {/* Chat */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={m.type === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.type === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-white whitespace-pre-line"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-white border text-slate-700 whitespace-pre-line shadow-sm"
                }
                style={m.type === "user" ? { backgroundColor: brand } : undefined}
              >
                {m.text}
              </div>
            </div>
          ))}

          {done && (
            <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-semibold">Contato enviado com sucesso</span>
              </div>
              {isOpen && whatsappHref ? (
                <>
                  <p className="text-sm text-slate-600">
                    Estamos atendendo agora. Se preferir, continue a conversa no WhatsApp.
                  </p>
                  <Button asChild className="w-full text-white" style={{ backgroundColor: brand }}>
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-2" /> Falar no WhatsApp
                    </a>
                  </Button>
                </>
              ) : (
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                  <span>
                    Recebemos seus dados fora do horário de atendimento. Retornamos no próximo horário disponível.
                    <span className="block text-xs text-slate-400 mt-1">{hoursLabel}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Composer */}
      {!done && (
        <footer className="bg-white border-t sticky bottom-0">
          <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
            {/* Honeypot: hidden from humans, filled by bots */}
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

            {askingConsent ? (
              <div className="space-y-3">
                <label className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed cursor-pointer">
                  <Checkbox
                    checked={consent}
                    onCheckedChange={(v) => setConsent(v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    {CONSENT_TEXT}
                    {(config.privacy_url || config.terms_url) && (
                      <span className="block mt-1 space-x-2">
                        {config.privacy_url && (
                          <a
                            href={config.privacy_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Política de privacidade
                          </a>
                        )}
                        {config.terms_url && (
                          <a href={config.terms_url} target="_blank" rel="noopener noreferrer" className="underline">
                            Termos de uso
                          </a>
                        )}
                      </span>
                    )}
                  </span>
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handleBack} disabled={submitting} aria-label="Voltar">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    className="flex-1 text-white"
                    style={{ backgroundColor: brand }}
                    onClick={handleSubmit}
                    disabled={submitting || !consent}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 mr-2" /> Enviar meus dados
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBack}
                  disabled={stepIndex === 0 || submitting}
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                  placeholder={step?.placeholder ?? "Digite aqui..."}
                  inputMode={step?.inputMode ?? "text"}
                  maxLength={1000}
                  autoFocus
                />
                {step?.optional && (
                  <Button variant="ghost" size="icon" onClick={handleSkip} aria-label="Pular">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  className="text-white shrink-0"
                  style={{ backgroundColor: brand }}
                  onClick={handleSend}
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center">
              Seus dados são usados apenas para o atendimento desta viagem. {hoursLabel}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
