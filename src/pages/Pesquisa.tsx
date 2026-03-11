import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, ExternalLink, Gift, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SurveyQuestion {
  id: string;
  order_index: number;
  question_type: "text" | "audio";
  question_text: string | null;
  audio_url: string | null;
  options: string[];
}

interface Survey {
  id: string;
  title: string;
  sender_name: string;
  avatar_url: string | null;
  empathy_after_question: number | null;
  empathy_message: string | null;
  final_message: string | null;
  gift_message: string | null;
  gift_type: string | null;
  gift_url: string | null;
  gift_file_name: string | null;
}

interface ChatMessage {
  id: string;
  type: "bot-text" | "bot-audio" | "bot-options" | "user" | "contact-form" | "gift";
  content?: string;
  audioUrl?: string;
  options?: string[];
  selectedOption?: string;
}

export default function Pesquisa() {
  const { slug } = useParams<{ slug: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; answer: string }[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [responseId, setResponseId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "chat" | "contact" | "done">("loading");
  const [contactName, setContactName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadSurvey();
  }, [slug]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const loadSurvey = async () => {
    const { data: surveyData } = await supabase
      .from("surveys")
      .select("*")
      .eq("slug", slug!)
      .eq("is_active", true)
      .single();

    if (!surveyData) {
      setPhase("done");
      return;
    }

    const { data: questionsData } = await supabase
      .from("survey_questions")
      .select("*")
      .eq("survey_id", surveyData.id)
      .order("order_index");

    const parsedQuestions: SurveyQuestion[] = (questionsData || []).map((q: any) => ({
      ...q,
      question_type: q.question_type as "text" | "audio",
      options: Array.isArray(q.options) ? q.options : [],
    }));

    setSurvey(surveyData as any);
    setQuestions(parsedQuestions);
    setPhase("chat");

    // Create initial response record
    const { data: resp } = await supabase
      .from("survey_responses")
      .insert({ survey_id: surveyData.id, session_id: sessionId })
      .select("id")
      .single();
    if (resp) setResponseId(resp.id);

    // Start with greeting then first question
    setTimeout(() => {
      addBotMessage(`Olá! 👋 Que bom ter você aqui. Vou te fazer algumas perguntas rápidas, leva menos de 1 minuto.`);
      setTimeout(() => sendQuestion(0, parsedQuestions, surveyData as any), 1500);
    }, 500);
  };

  const addBotMessage = (text: string) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: "bot-text", content: text },
      ]);
    }, 800);
  };

  const sendQuestion = (idx: number, qs: SurveyQuestion[], s: Survey) => {
    if (idx >= qs.length) {
      finishSurvey(s);
      return;
    }

    const q = qs[idx];
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const newMessages: ChatMessage[] = [];

      if (q.question_type === "audio" && q.audio_url) {
        newMessages.push({
          id: crypto.randomUUID(),
          type: "bot-audio",
          audioUrl: q.audio_url,
          content: q.question_text || undefined,
        });
      } else if (q.question_text) {
        newMessages.push({
          id: crypto.randomUUID(),
          type: "bot-text",
          content: q.question_text,
        });
      }

      if (q.options.length > 0) {
        newMessages.push({
          id: crypto.randomUUID(),
          type: "bot-options",
          options: q.options,
        });
      }

      setMessages((prev) => [...prev, ...newMessages]);
      setCurrentQuestion(idx);
    }, 1000);
  };

  const handleAnswer = (option: string, questionIdx: number) => {
    const q = questions[questionIdx];

    // Remove options message and add user response
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.type !== "bot-options");
      return [
        ...filtered,
        { id: crypto.randomUUID(), type: "user", content: option },
      ];
    });

    const newAnswers = [...answers, { questionId: q.id, answer: option }];
    setAnswers(newAnswers);

    // Update response in DB
    if (responseId) {
      supabase
        .from("survey_responses")
        .update({ answers: newAnswers as any })
        .eq("id", responseId)
        .then();
    }

    // Check if empathy message should be shown
    const nextIdx = questionIdx + 1;
    if (survey?.empathy_after_question === questionIdx + 1) {
      setTimeout(() => {
        addBotMessage(survey.empathy_message || "Interessante… muitos agentes de viagens comentam exatamente isso também.");
        setTimeout(() => sendQuestion(nextIdx, questions, survey), 2000);
      }, 500);
    } else {
      setTimeout(() => sendQuestion(nextIdx, questions, survey!), 800);
    }
  };

  const finishSurvey = (s: Survey) => {
    setTimeout(() => {
      addBotMessage(s.final_message || "Obrigado por responder! 🙏");
      setTimeout(() => {
        if (s.gift_url || s.gift_message) {
          addBotMessage(s.gift_message || "Como agradecimento, preparei um presente para você.");
          setTimeout(() => {
            setPhase("contact");
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), type: "contact-form" },
            ]);
          }, 1500);
        } else {
          setPhase("done");
        }
      }, 2000);
    }, 500);
  };

  const handleSubmitContact = async () => {
    if (!contactInfo.trim()) {
      toast.error("Informe seu WhatsApp ou e-mail");
      return;
    }
    setSubmitting(true);

    if (responseId) {
      await supabase
        .from("survey_responses")
        .update({
          contact_name: contactName || null,
          contact_info: contactInfo,
          completed_at: new Date().toISOString(),
        })
        .eq("id", responseId);
    }

    // Remove contact form and show gift
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.type !== "contact-form");
      return [
        ...filtered,
        { id: crypto.randomUUID(), type: "user", content: contactName ? `${contactName} - ${contactInfo}` : contactInfo },
      ];
    });

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), type: "gift" },
      ]);
      setPhase("done");
      setSubmitting(false);
    }, 1000);
  };

  const totalQuestions = questions.length;
  const answeredCount = answers.length;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const avatarUrl = survey?.avatar_url || "https://ui-avatars.com/api/?name=Fernando&background=0D8ABC&color=fff&size=128";
  const senderName = survey?.sender_name || "Fernando";

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#e5ddd5]">
        <Loader2 className="h-8 w-8 animate-spin text-[#075e54]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e5ddd5] flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <img
          src={avatarUrl}
          alt={senderName}
          className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{senderName}</p>
          <p className="text-xs text-white/70">online</p>
        </div>
      </div>

      {/* Progress bar */}
      {totalQuestions > 0 && (
        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 border-b flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
            Pergunta {Math.min(answeredCount + 1, totalQuestions)} de {totalQuestions}
          </span>
          <Progress value={progressPercent} className="h-2 flex-1" />
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23c5bfb4\" fill-opacity=\"0.15\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            avatarUrl={avatarUrl}
            senderName={senderName}
            currentQuestion={currentQuestion}
            onSelectOption={handleAnswer}
            survey={survey}
            contactName={contactName}
            contactInfo={contactInfo}
            setContactName={setContactName}
            setContactInfo={setContactInfo}
            onSubmitContact={handleSubmitContact}
            submitting={submitting}
          />
        ))}

        {typing && (
          <div className="flex items-end gap-2">
            <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  avatarUrl,
  senderName,
  currentQuestion,
  onSelectOption,
  survey,
  contactName,
  contactInfo,
  setContactName,
  setContactInfo,
  onSubmitContact,
  submitting,
}: {
  message: ChatMessage;
  avatarUrl: string;
  senderName: string;
  currentQuestion: number;
  onSelectOption: (option: string, questionIdx: number) => void;
  survey: Survey | null;
  contactName: string;
  contactInfo: string;
  setContactName: (v: string) => void;
  setContactInfo: (v: string) => void;
  onSubmitContact: () => void;
  submitting: boolean;
}) {
  if (message.type === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-[#dcf8c6] rounded-2xl rounded-br-md px-4 py-2 max-w-[80%] shadow-sm">
          <p className="text-sm text-gray-800">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.type === "bot-text") {
    return (
      <div className="flex items-end gap-2">
        <img src={avatarUrl} alt={senderName} className="w-7 h-7 rounded-full object-cover shrink-0" />
        <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%] shadow-sm">
          <p className="text-sm text-gray-800 whitespace-pre-line">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.type === "bot-audio") {
    return (
      <div className="flex items-end gap-2">
        <img src={avatarUrl} alt={senderName} className="w-7 h-7 rounded-full object-cover shrink-0" />
        <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] shadow-sm space-y-2">
          <audio controls className="w-full h-10" src={message.audioUrl}>
            Seu navegador não suporta áudio.
          </audio>
          {message.content && (
            <p className="text-xs text-muted-foreground">{message.content}</p>
          )}
        </div>
      </div>
    );
  }

  if (message.type === "bot-options") {
    return (
      <div className="flex flex-col gap-2 pl-9 max-w-[85%]">
        {message.options?.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelectOption(opt, currentQuestion)}
            className="text-left bg-white border border-[#075e54]/20 text-[#075e54] font-medium rounded-xl px-4 py-2.5 text-sm shadow-sm hover:bg-[#075e54] hover:text-white transition-colors active:scale-95"
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (message.type === "contact-form") {
    return (
      <div className="flex items-end gap-2">
        <img src={avatarUrl} alt={senderName} className="w-7 h-7 rounded-full object-cover shrink-0" />
        <div className="bg-white rounded-2xl rounded-bl-md px-4 py-4 max-w-[85%] shadow-sm space-y-3">
          <p className="text-sm text-gray-800 font-medium">Para receber seu presente, me diga:</p>
          <Input
            placeholder="Seu nome (opcional)"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="text-sm h-9"
          />
          <Input
            placeholder="WhatsApp ou e-mail *"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            className="text-sm h-9"
            required
          />
          <Button
            onClick={onSubmitContact}
            disabled={submitting}
            className="w-full bg-[#075e54] hover:bg-[#064d44] text-white gap-2"
            size="sm"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            Quero receber meu presente
          </Button>
        </div>
      </div>
    );
  }

  if (message.type === "gift") {
    return (
      <div className="flex items-end gap-2">
        <img src={avatarUrl} alt={senderName} className="w-7 h-7 rounded-full object-cover shrink-0" />
        <div className="bg-white rounded-2xl rounded-bl-md px-4 py-4 max-w-[85%] shadow-sm space-y-3">
          <p className="text-sm text-gray-800">🎁 Aqui está seu presente!</p>
          {survey?.gift_url && (
            <a
              href={survey.gift_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#075e54] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#064d44] transition-colors"
            >
              {survey.gift_type === "link" ? (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Acessar presente
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Baixar {survey.gift_file_name || "presente"}
                </>
              )}
            </a>
          )}
        </div>
      </div>
    );
  }

  return null;
}
