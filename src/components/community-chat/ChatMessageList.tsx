import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, CheckCheck } from "lucide-react";

interface MessageData {
  id: string;
  content: string;
  created_at: string;
  user_id?: string;
  sender_id?: string;
  read_at?: string | null;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

interface ChatMessageListProps {
  messages: MessageData[];
  showReadStatus?: boolean;
  /** Mensagem encontrada pela busca da Comunidade: rola até ela e destaca. */
  highlightMessageId?: string | null;
}

export function ChatMessageList({ messages, showReadStatus, highlightMessageId }: ChatMessageListProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightMessageId) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, highlightMessageId]);

  useEffect(() => {
    if (!highlightMessageId) return;
    highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightMessageId, messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8">
        Nenhuma mensagem ainda. Seja o primeiro a enviar! 💬
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {messages.map((msg, idx) => {
        const senderId = msg.sender_id || msg.user_id;
        const isOwn = senderId === user?.id;
        const showAvatar =
          idx === 0 ||
          (messages[idx - 1].sender_id || messages[idx - 1].user_id) !== senderId;

        return (
          <div
            key={msg.id}
            ref={highlightMessageId === msg.id ? highlightRef : undefined}
            data-chat-message-highlight={highlightMessageId === msg.id ? "true" : undefined}
            className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""} ${
              highlightMessageId === msg.id ? "rounded-2xl ring-2 ring-primary/60" : ""
            }`}
          >
            {!isOwn && showAvatar ? (
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={msg.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {msg.profile?.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            ) : !isOwn ? (
              <div className="w-7" />
            ) : null}

            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                isOwn
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {!isOwn && showAvatar && (
                <p className="text-xs font-semibold mb-0.5 opacity-80">
                  {msg.profile?.name || "Agente"}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <div
                className={`flex items-center gap-1 mt-0.5 ${
                  isOwn ? "justify-end" : ""
                }`}
              >
                <span className="text-[10px] opacity-60">
                  {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                </span>
                {showReadStatus && isOwn && (
                  msg.read_at ? (
                    <CheckCheck className="h-3 w-3 opacity-60" />
                  ) : (
                    <Check className="h-3 w-3 opacity-40" />
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
