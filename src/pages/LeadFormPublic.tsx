import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FormData {
  id: string;
  user_id: string;
  welcome_message: string | null;
}

interface AgentProfile {
  name: string;
  phone: string | null;
  avatar_url: string | null;
  agency_name: string | null;
}

interface ChatMessage {
  id: string;
  type: "bot" | "user";
  text: string;
  isTyping?: boolean;
}

const WIZARD_STEPS = [
  { key: "name", question: "Para começar, qual é o seu nome? 😊" },
  { key: "phone", question: "Ótimo! Qual seu número de WhatsApp com DDD?" },
  { key: "destination", question: "Para qual destino você gostaria de viajar? ✈️" },
  { key: "travel_dates", question: "Tem alguma data ou período em mente?" },
  { key: "travelers_count", question: "Quantas pessoas vão viajar?" },
  { key: "budget", question: "Tem um orçamento aproximado em mente? (pode ser um valor por pessoa ou total)" },
  { key: "additional_info", question: "Quer adicionar algo mais? Algum pedido especial, dúvida ou observação? 💬" },
];

export default function LeadFormPublic() {
  const { token } = useParams<{ token: string }>();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load form and agent data
  useEffect(() => {
    async function load() {
      if (!token) return;
      const { data: form, error } = await supabase
        .from("lead_capture_forms")
        .select("id, user_id, welcome_message")
        .eq("token", token)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !form) {
        setLoading(false);
        return;
      }

      setFormData(form as FormData);

      // Load agent profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, phone, avatar_url, agency_name")
        .eq("user_id", (form as FormData).user_id)
        .maybeSingle();

      if (profile) setAgent(profile as AgentProfile);

      // Show welcome message
      const welcomeMsg = (form as FormData).welcome_message || "Olá! 👋 Vou te ajudar a planejar sua viagem!";
      setMessages([
        { id: "welcome", type: "bot", text: welcomeMsg },
        { id: "q0", type: "bot", text: WIZARD_STEPS[0].question },
      ]);

      setLoading(false);
    }
    load();
  }, [token]);

  const addBotMessage = (text: string) => {
    const id = `bot-${Date.now()}`;
    setMessages((prev) => [...prev, { id, type: "bot", text }]);
  };

  const generateEmpathy = async (question: string, answer: string) => {
    try {
      const { data } = await supabase.functions.invoke("lead-wizard-ai", {
        body: { type: "empathy", data: { question, answer } },
      });
      return data?.response || null;
    } catch {
      return null;
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending || isComplete || isFinalizing) return;

    const answer = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    // Add user message
    const step = WIZARD_STEPS[currentStep];
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, type: "user", text: answer }]);

    const newAnswers = { ...answers, [step.key]: answer };
    setAnswers(newAnswers);

    const nextStep = currentStep + 1;

    if (nextStep < WIZARD_STEPS.length) {
      // Generate empathy response
      const empathy = await generateEmpathy(step.question, answer);
      if (empathy) addBotMessage(empathy);

      // Show next question
      setTimeout(() => {
        addBotMessage(WIZARD_STEPS[nextStep].question);
        setCurrentStep(nextStep);
        setIsSending(false);
      }, empathy ? 800 : 300);
    } else {
      // All steps done - block input immediately and finalize
      setIsFinalizing(true);
      addBotMessage("Perfeito! 🎯 Estou preparando tudo pra você...");
      await finalizeLead(newAnswers);
      setIsSending(false);
    }
  };

  const finalizeLead = async (allAnswers: Record<string, string>) => {
    if (!formData) {
      addBotMessage("Obrigado pelas informações! Entraremos em contato em breve. 😊");
      setIsComplete(true);
      return;
    }

    try {
      let suggestion = "";
      let whatsappMessage = `Olá! Tenho interesse em uma viagem. Meu nome é ${allAnswers.name}.`;

      // Try AI suggestion only if agent exists
      if (agent) {
        try {
          const { data: aiData } = await supabase.functions.invoke("lead-wizard-ai", {
            body: {
              type: "suggestion",
              data: {
                leadName: allAnswers.name,
                destination: allAnswers.destination,
                travelDates: allAnswers.travel_dates,
                travelersCount: allAnswers.travelers_count,
                budget: allAnswers.budget,
                additionalInfo: allAnswers.additional_info,
              },
              agentName: agent.name,
              agentPhone: agent.phone,
            },
          });
          suggestion = aiData?.suggestion || "";
          whatsappMessage = aiData?.whatsapp_message || whatsappMessage;
        } catch (aiErr) {
          console.warn("AI suggestion failed, continuing without it:", aiErr);
        }
      }

      setAiSuggestion(suggestion);

      // Save lead (don't let save failure block completion)
      try {
        await supabase.from("lead_captures").insert({
          form_id: formData.id,
          agent_user_id: formData.user_id,
          lead_name: allAnswers.name,
          lead_phone: allAnswers.phone,
          destination: allAnswers.destination || null,
          travel_dates: allAnswers.travel_dates || null,
          travelers_count: allAnswers.travelers_count || null,
          budget: allAnswers.budget || null,
          additional_info: allAnswers.additional_info || null,
          ai_suggestion: suggestion,
          whatsapp_message: whatsappMessage,
        } as never);
      } catch (saveErr) {
        console.error("Lead save error:", saveErr);
      }

      // Build WhatsApp URL
      if (agent?.phone) {
        const cleanPhone = agent.phone.replace(/\D/g, "");
        const encoded = encodeURIComponent(whatsappMessage);
        setWhatsappUrl(`https://wa.me/${cleanPhone}?text=${encoded}`);
      }

      // Show AI suggestion
      if (suggestion) {
        addBotMessage(suggestion);
      }

      setTimeout(() => {
        addBotMessage(
          agent?.phone
            ? `Pronto! Agora é só clicar no botão abaixo para falar diretamente com ${agent.name} pelo WhatsApp! 💚`
            : `Obrigado! ${agent?.name || "Nosso consultor"} vai entrar em contato com você em breve!`
        );
        setIsComplete(true);
      }, 1500);
    } catch (err) {
      console.error("Finalize error:", err);
      addBotMessage("Obrigado pelas informações! Entraremos em contato em breve. 😊");
      setIsComplete(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="text-center max-w-md">
          <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-700 mb-2">Formulário não encontrado</h1>
          <p className="text-gray-500">Este link pode ter expirado ou estar inativo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-emerald-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        {agent?.avatar_url ? (
          <img src={agent.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-200" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-800 text-sm">{agent?.name || "Consultor de Viagens"}</p>
          {agent?.agency_name && <p className="text-xs text-gray-500">{agent.agency_name}</p>}
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-2xl w-full mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.type === "user"
                  ? "bg-emerald-600 text-white rounded-br-md"
                  : "bg-white text-gray-800 rounded-bl-md border border-gray-100"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-400 px-4 py-2.5 rounded-2xl rounded-bl-md border border-gray-100 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {isComplete && whatsappUrl && (
          <div className="flex justify-center pt-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold px-6 py-3 rounded-full shadow-lg transition-all hover:scale-105"
            >
              <ExternalLink className="h-5 w-5" />
              Falar no WhatsApp
            </a>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      {!isComplete && !isFinalizing && (
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-gray-100 p-3 max-w-2xl w-full mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Digite sua resposta..."
              disabled={isSending}
              className="flex-1 rounded-full border-gray-200 focus-visible:ring-emerald-500"
              autoFocus
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || isSending}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
