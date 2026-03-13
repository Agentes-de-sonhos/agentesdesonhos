import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, Send, Trash2, Search, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface CrmContact {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  empresa: string | null;
  status: string;
  origem: string | null;
  created_at: string;
  updated_at: string;
}

interface CrmTemplate {
  id: string;
  nome_template: string;
  assunto: string;
  mensagem: string;
}

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  email_enviado: "Email Enviado",
  respondido: "Respondido",
  convertido: "Convertido",
  inativo: "Inativo",
};

const STATUS_COLORS: Record<string, string> = {
  novo: "bg-blue-500",
  email_enviado: "bg-yellow-500",
  respondido: "bg-green-500",
  convertido: "bg-purple-500",
  inativo: "bg-muted",
};

export function AdminCrmContacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [newContact, setNewContact] = useState({ nome: "", email: "", telefone: "", empresa: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<CrmContact | null>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["crm-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmContact[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["crm-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmTemplate[];
    },
  });

  const addContactMutation = useMutation({
    mutationFn: async (contact: typeof newContact) => {
      const { error } = await supabase.from("crm_contacts").insert({
        nome: contact.nome,
        email: contact.email,
        telefone: contact.telefone || null,
        empresa: contact.empresa || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({ title: "Contato adicionado!" });
      setAddOpen(false);
      setNewContact({ nome: "", email: "", telefone: "", empresa: "" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const updateContactMutation = useMutation({
    mutationFn: async (contact: CrmContact) => {
      const { error } = await supabase
        .from("crm_contacts")
        .update({
          nome: contact.nome,
          email: contact.email,
          telefone: contact.telefone || null,
          empresa: contact.empresa || null,
          status: contact.status,
          origem: contact.origem || null,
        })
        .eq("id", contact.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({ title: "Contato atualizado!" });
      setEditOpen(false);
      setEditContact(null);
    },
    onError: (err: Error) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({ title: "Contato excluído!" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (params: { contact_id: string; template_id?: string; email: string; assunto: string; mensagem: string }) => {
      const { data, error } = await supabase.functions.invoke("send-crm-email", { body: params });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-email-logs"] });
      toast({ title: "Email enviado com sucesso!" });
      setSendOpen(false);
    },
    onError: (err: Error) => toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" }),
  });

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      const contacts = rows
        .filter((r) => r.email || r.Email)
        .map((r) => ({
          nome: r.nome || r.Nome || r.name || r.Name || "",
          email: r.email || r.Email || "",
          telefone: r.telefone || r.Telefone || r.phone || r.Phone || null,
          empresa: r.empresa || r.Empresa || r.company || r.Company || null,
          origem: "importacao",
        }));

      if (contacts.length === 0) {
        toast({ title: "Nenhum contato válido encontrado", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("crm_contacts").insert(contacts);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({ title: `${contacts.length} contatos importados!` });
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openSendModal = (contact: CrmContact) => {
    setSelectedContact(contact);
    setSelectedTemplate("");
    setEmailSubject("");
    setEmailBody("");
    setSendOpen(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setEmailSubject(tpl.assunto);
      setEmailBody(tpl.mensagem.replace(/\{\{nome\}\}/g, selectedContact?.nome || ""));
    }
  };

  const handleSendEmail = () => {
    if (!selectedContact || !emailSubject || !emailBody) return;
    sendEmailMutation.mutate({
      contact_id: selectedContact.id,
      template_id: selectedTemplate || undefined,
      email: selectedContact.email,
      assunto: emailSubject,
      mensagem: emailBody,
    });
  };

  const filtered = contacts.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.empresa || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Contatos ({contacts.length})</CardTitle>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileImport}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Importar CSV/Excel
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.nome}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.empresa || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${STATUS_COLORS[contact.status] || ""} text-white`}>
                      {STATUS_LABELS[contact.status] || contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{contact.origem || "manual"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openSendModal(contact)} title="Enviar email">
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteContactMutation.mutate(contact.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum contato encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Contact Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={newContact.nome} onChange={(e) => setNewContact({ ...newContact, nome: e.target.value })} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={newContact.telefone} onChange={(e) => setNewContact({ ...newContact, telefone: e.target.value })} />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input value={newContact.empresa} onChange={(e) => setNewContact({ ...newContact, empresa: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addContactMutation.mutate(newContact)} disabled={!newContact.nome || !newContact.email || addContactMutation.isPending}>
              {addContactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Email para {selectedContact?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template (opcional)</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome_template}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assunto *</Label>
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
            <div>
              <Label>Mensagem *</Label>
              <Textarea rows={6} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Use {{nome}} para inserir o nome do contato" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSendEmail} disabled={!emailSubject || !emailBody || sendEmailMutation.isPending}>
              {sendEmailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
