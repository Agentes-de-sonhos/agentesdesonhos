import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  HelpCircle,
  X,
  Send,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  LifeBuoy,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Esconder explicitamente em rotas públicas / não autenticadas
const PUBLIC_PATH_PREFIXES = [
  "/auth",
  "/login",
  "/cadastro",
  "/onboarding",
  "/landing",
  "/lp",
  "/carteira",
  "/carteira-publica",
  "/orcamento-publico",
  "/roteiro-publico",
  "/viagem-publica",
  "/vitrine",
  "/cartao",
  "/contato",
  "/c/",
  "/v/",
  "/p/",
  "/r/",
  "/o/",
  "/ativar-cartao",
  "/politica",
  "/termos",
  "/privacidade",
  "/share",
];

const SUGGESTIONS = [
  "Como criar uma oportunidade no CRM?",
  "Como criar uma carteira digital?",
  "Como compartilhar um orçamento?",
  "Como registrar uma venda?",
  "Como abrir um chamado de suporte?",
  "Como configurar permissões da equipe?",
  "Como consultar minhas faturas?",
  "Como usar a agenda?",
];

interface Source {
  id: string;
  title: string;
  module: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  fallback_used?: boolean;
  pending?: boolean;
}

const INITIAL_GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "Olá! Sou o **Assistente da Central de Ajuda** do Agentes de Sonhos. Posso te orientar sobre o uso da plataforma com base na documentação oficial.\n\nEm casos sensíveis (exclusões financeiras, permissões, integrações, regras ainda não confirmadas), vou indicar o suporte humano.",
};

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`),
  );
}

export function HelpAssistantWidget() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, "up" | "down">>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const hidden = useMemo(() => isPublicPath(location.pathname), [location.pathname]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  if (loading || !user || hidden) return null;

  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || sending) return;
    if (text.length > 1000) {
      toast({
        title: "Mensagem muito longa",
        description: "Resuma sua pergunta (máx. 1000 caracteres).",
        variant: "destructive",
      });
      return;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const placeholder: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput("");
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("help-assistant-chat", {
        body: {
          message: text,
          conversation_id: conversationId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setConversationId(data.conversation_id ?? conversationId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? {
                id: data.message_id ?? placeholder.id,
                role: "assistant",
                content: data.answer ?? "",
                sources: data.sources ?? [],
                fallback_used: data.fallback_used,
              }
            : m,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Falha ao consultar o assistente. Tente novamente.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? {
                ...m,
                pending: false,
                content: `⚠️ ${message}`,
                fallback_used: true,
              }
            : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  const handleFeedback = async (messageId: string, rating: "up" | "down") => {
    if (!messageId || messageId === "greeting" || feedbackGiven[messageId]) return;
    setFeedbackGiven((prev) => ({ ...prev, [messageId]: rating }));
    try {
      await supabase.functions.invoke("help-assistant-feedback", {
        body: { message_id: messageId, rating },
      });
      toast({
        title: rating === "up" ? "Obrigado pelo feedback!" : "Feedback registrado",
        description:
          rating === "down"
            ? "Se preferir, abra um chamado no Suporte para atendimento humano."
            : undefined,
      });
    } catch {
      // silencioso — feedback é best-effort
    }
  };

  const handleClear = () => {
    setMessages([INITIAL_GREETING]);
    setConversationId(null);
    setFeedbackGiven({});
  };

  const handleOpenSupport = () => {
    setOpen(false);
    navigate("/suporte");
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir Assistente da Central de Ajuda"
          className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:bottom-6"
        >
          <HelpCircle className="h-7 w-7" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Assistente da Central de Ajuda"
          className={cn(
            "fixed z-50 flex flex-col bg-background shadow-2xl",
            "inset-x-0 bottom-0 top-0 sm:inset-auto sm:right-4 sm:bottom-6 sm:top-auto",
            "sm:h-[640px] sm:max-h-[85vh] sm:w-[420px] sm:rounded-2xl sm:border",
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold leading-tight">
                  Assistente da Central de Ajuda
                </h3>
                <p className="text-xs text-muted-foreground">
                  Respostas baseadas na documentação oficial. Não executa ações.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Aviso de privacidade */}
          <div className="flex items-start gap-2 border-b bg-amber-50 px-4 py-2 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Não envie senhas, dados de cartão ou documentos completos neste chat.
            </span>
          </div>

          {/* Histórico */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onFeedback={(r) => handleFeedback(m.id, r)}
                  feedbackGiven={feedbackGiven[m.id]}
                  onOpenSupport={handleOpenSupport}
                />
              ))}

              {messages.length === 1 && (
                <div className="pt-2">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Sugestões rápidas:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSend(s)}
                        className="rounded-full border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Pergunte sobre o uso da plataforma..."
                rows={2}
                maxLength={1000}
                disabled={sending}
                className="min-h-[44px] resize-none"
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={sending || !input.trim()}
                aria-label="Enviar"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" /> Limpar conversa
              </button>
              <button
                type="button"
                onClick={handleOpenSupport}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <LifeBuoy className="h-3 w-3" /> Abrir chamado no Suporte
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onFeedback: (r: "up" | "down") => void;
  feedbackGiven?: "up" | "down";
  onOpenSupport: () => void;
}

function MessageBubble({
  message,
  onFeedback,
  feedbackGiven,
  onOpenSupport,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.pending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Pensando...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground [&_p]:my-1 [&_ol]:my-1 [&_ul]:my-1 [&_li]:my-0">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>

      {message.sources && message.sources.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Fontes
          </p>
          <div className="flex flex-wrap gap-1">
            {message.sources.slice(0, 5).map((s) => (
              <Badge
                key={s.id}
                variant="secondary"
                className="font-normal text-[11px]"
              >
                {s.module} — {s.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {message.fallback_used && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSupport}
          className="h-7 gap-1 text-xs"
        >
          <LifeBuoy className="h-3 w-3" /> Abrir chamado no Suporte
        </Button>
      )}

      {message.id !== "greeting" && (
        <div className="flex items-center gap-1 pt-1">
          <span className="mr-1 text-[11px] text-muted-foreground">Foi útil?</span>
          <button
            type="button"
            onClick={() => onFeedback("up")}
            disabled={!!feedbackGiven}
            className={cn(
              "rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground",
              feedbackGiven === "up" && "bg-accent text-foreground",
              feedbackGiven && feedbackGiven !== "up" && "opacity-40",
            )}
            aria-label="Foi útil"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onFeedback("down")}
            disabled={!!feedbackGiven}
            className={cn(
              "rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground",
              feedbackGiven === "down" && "bg-accent text-foreground",
              feedbackGiven && feedbackGiven !== "down" && "opacity-40",
            )}
            aria-label="Não ajudou"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}