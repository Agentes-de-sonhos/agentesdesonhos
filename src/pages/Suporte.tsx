import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Headset, Plus, ArrowLeft, Send, Paperclip, Loader2, Clock, MessageSquare, X, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSupportTickets, useTicketMessages } from "@/hooks/useSupportTickets";
import { TICKET_CATEGORIES, TICKET_STATUSES, type TicketCategory, type SupportTicket } from "@/types/support";

function NewTicketDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("geral");
  const [content, setContent] = useState("");
  const { createTicket } = useSupportTickets();

  const handleSubmit = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    try {
      const ticket = await createTicket.mutateAsync({ subject, category, content });
      toast.success("Chamado criado com sucesso!");
      setOpen(false);
      setSubject("");
      setCategory("geral");
      setContent("");
      onCreated(ticket.id);
    } catch {
      toast.error("Erro ao criar chamado");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Abrir Chamado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Chamado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium">Assunto</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Descreva brevemente o problema" />
          </div>
          <div>
            <label className="text-sm font-medium">Categoria</label>
            <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TICKET_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Descreva o problema com detalhes..." rows={5} />
          </div>
          <Button onClick={handleSubmit} disabled={createTicket.isPending} className="w-full">
            {createTicket.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar Chamado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TicketChat({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const { messages, isLoading, sendMessage, uploadAttachment, markAsRead } = useTicketMessages(ticket.id);
  const { updateStatus } = useSupportTickets();
  const [input, setInput] = useState("");
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    markAsRead();
  }, [messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const statusInfo = TICKET_STATUSES[ticket.status as keyof typeof TICKET_STATUSES];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[400px]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{ticket.subject}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={cn("text-[10px]", statusInfo?.color)}>{statusInfo?.label}</Badge>
            <span className="text-xs text-muted-foreground">{TICKET_CATEGORIES[ticket.category as TicketCategory]}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem ainda</p>
        ) : (
          messages.map((msg) => {
            const isOwn = !msg.is_admin;
            return (
              <div key={msg.id} className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}>
                {!isOwn && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={msg.sender_avatar || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">S</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2",
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}>
                  {!isOwn && <p className="text-[10px] font-semibold mb-0.5 opacity-70">Suporte</p>}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.attachment_urls?.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {msg.attachment_urls.map((url, i) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                        return isImage ? (
                          <img key={i} src={url} alt="" className="max-w-full rounded-lg max-h-48 cursor-pointer" onClick={() => window.open(url, "_blank")} />
                        ) : (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline block">
                            📎 Anexo {i + 1}
                          </a>
                        );
                      })}
                    </div>
                  )}
                  <p className={cn("text-[10px] mt-1", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
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
              <button onClick={() => setAttachFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {ticket.status !== "resolvido" && (
        <div className="flex items-end gap-2 pt-2 border-t">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
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
            placeholder="Digite sua mensagem..."
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <Button size="icon" onClick={handleSend} disabled={sendMessage.isPending} className="shrink-0">
            {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {ticket.status === "resolvido" && (
        <div className="text-center py-3 border-t">
          <p className="text-sm text-muted-foreground">Este chamado foi resolvido ✅</p>
        </div>
      )}
    </div>
  );
}

export default function Suporte() {
  const { tickets, isLoading } = useSupportTickets();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const handleTicketCreated = (id: string) => {
    // Will be selected after refresh
    setTimeout(() => {
      const ticket = tickets.find((t) => t.id === id);
      if (ticket) setSelectedTicket(ticket);
    }, 1000);
  };

  // Update selected ticket data when tickets refresh
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find((t) => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  }, [tickets]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Headset className="h-6 w-6 text-primary" /> Suporte
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Envie suas dúvidas e acompanhe seus chamados</p>
          </div>
          <NewTicketDialog onCreated={handleTicketCreated} />
        </div>

        {selectedTicket ? (
          <Card>
            <CardContent className="pt-4">
              <TicketChat ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meus Chamados</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground">Nenhum chamado aberto</p>
                  <p className="text-xs text-muted-foreground">Clique em "Abrir Chamado" para criar o primeiro</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => {
                    const statusInfo = TICKET_STATUSES[ticket.status as keyof typeof TICKET_STATUSES];
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm truncate">{ticket.subject}</span>
                            <Badge className={cn("text-[10px] shrink-0", statusInfo?.color)}>{statusInfo?.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{TICKET_CATEGORIES[ticket.category as TicketCategory]}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(ticket.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
