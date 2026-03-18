import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Send, Paperclip, Loader2, Clock, MessageSquare, Search, X, Tag,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSupportTickets, useTicketMessages } from "@/hooks/useSupportTickets";
import { TICKET_CATEGORIES, TICKET_STATUSES, type TicketCategory, type TicketStatus, type SupportTicket } from "@/types/support";

function AdminTicketChat({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const { messages, isLoading, sendMessage, uploadAttachment, markAsRead } = useTicketMessages(ticket.id);
  const { updateStatus, updateTags } = useSupportTickets();
  const [input, setInput] = useState("");
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const [newTag, setNewTag] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { markAsRead(); }, [messages.length]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text && attachFiles.length === 0) return;
    try {
      let attachmentUrls: string[] = [];
      for (const file of attachFiles) {
        const url = await uploadAttachment(file);
        attachmentUrls.push(url);
      }
      await sendMessage.mutateAsync({ content: text || "📎 Anexo", attachmentUrls });
      setInput("");
      setAttachFiles([]);
    } catch {
      toast.error("Erro ao enviar mensagem");
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const tags = [...(ticket.tags || []), newTag.trim()];
    updateTags.mutate({ ticketId: ticket.id, tags });
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    const tags = (ticket.tags || []).filter((t) => t !== tag);
    updateTags.mutate({ ticketId: ticket.id, tags });
  };

  const statusInfo = TICKET_STATUSES[ticket.status as TicketStatus];

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[400px]">
      {/* Header */}
      <div className="flex items-start gap-3 pb-3 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 mt-0.5">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{ticket.subject}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">{ticket.user_name || "Usuário"}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{TICKET_CATEGORIES[ticket.category as TicketCategory]}</span>
          </div>
          {/* Tags */}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {ticket.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] gap-1 h-5">
                {tag}
                <button onClick={() => handleRemoveTag(tag)}><X className="h-2.5 w-2.5" /></button>
              </Badge>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="+ tag"
                className="h-5 w-16 text-[10px] px-1"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(); }}
              />
            </div>
          </div>
        </div>
        <Select
          value={ticket.status}
          onValueChange={(v) => {
            updateStatus.mutate({ ticketId: ticket.id, status: v as TicketStatus });
            toast.success("Status atualizado");
          }}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TICKET_STATUSES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.is_admin;
            return (
              <div key={msg.id} className={cn("flex gap-2", isAdmin ? "justify-end" : "justify-start")}>
                {!isAdmin && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={msg.sender_avatar || undefined} />
                    <AvatarFallback className="bg-muted text-xs">{msg.sender_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2",
                  isAdmin ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                )}>
                  {!isAdmin && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.sender_name}</p>}
                  {isAdmin && <p className="text-[10px] font-semibold mb-0.5 text-primary-foreground/70">Suporte (Você)</p>}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.attachment_urls?.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {msg.attachment_urls.map((url, i) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                        return isImage ? (
                          <img key={i} src={url} alt="" className="max-w-full rounded-lg max-h-48 cursor-pointer" onClick={() => window.open(url, "_blank")} />
                        ) : (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline block">📎 Anexo {i + 1}</a>
                        );
                      })}
                    </div>
                  )}
                  <p className={cn("text-[10px] mt-1", isAdmin ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attach preview */}
      {attachFiles.length > 0 && (
        <div className="flex gap-2 flex-wrap pb-2">
          {attachFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-1 bg-muted rounded-full px-2 py-1 text-xs">
              <span className="truncate max-w-[120px]">{f.name}</span>
              <button onClick={() => setAttachFiles((prev) => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 pt-2 border-t">
        <input ref={fileInputRef} type="file" className="hidden" multiple
          onChange={(e) => {
            if (e.target.files) setAttachFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Responder ao usuário..."
          className="min-h-[40px] max-h-[120px] resize-none"
          rows={1}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button size="icon" onClick={handleSend} disabled={sendMessage.isPending} className="shrink-0">
          {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function AdminTicketsManager() {
  const { tickets, isLoading } = useSupportTickets();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Update selected ticket data
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find((t) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  }, [tickets]);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        (t.user_name || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (selectedTicket) {
    return (
      <Card>
        <CardContent className="pt-4">
          <AdminTicketChat ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-primary" /> Tickets de Suporte
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por assunto ou usuário..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(TICKET_STATUSES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(TICKET_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Nenhum ticket encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ticket) => {
              const statusInfo = TICKET_STATUSES[ticket.status as TicketStatus];
              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center gap-3"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={ticket.user_avatar || undefined} />
                    <AvatarFallback className="bg-muted text-xs">{ticket.user_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">{ticket.subject}</span>
                      <Badge className={cn("text-[10px] shrink-0", statusInfo?.color)}>{statusInfo?.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{ticket.user_name || "Usuário"}</span>
                      <span>{TICKET_CATEGORIES[ticket.category as TicketCategory]}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(ticket.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {ticket.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {ticket.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[9px] h-4">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
