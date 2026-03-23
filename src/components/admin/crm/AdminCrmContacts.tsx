import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, Send, Trash2, Search, Loader2, RefreshCw } from "lucide-react";
import { ConfirmDeleteDialog } from "../ConfirmDeleteDialog";
import * as XLSX from "xlsx";

interface CrmContact {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  empresa: string | null;
  status: string;
  origem: string | null;
  category: string | null;
  subcategory: string | null;
  created_at: string;
  updated_at: string;
}

interface CrmTemplate {
  id: string;
  nome_template: string;
  assunto: string;
  mensagem: string;
}

const CATEGORIES = [
  "Agente de Viagens",
  "Operadora de Turismo",
  "Consolidadora",
  "Companhia Aérea",
  "Hotelaria",
  "Locadora de Veículos",
  "Cruzeiros",
  "Seguro Viagem",
  "Parques e Atrações",
  "Receptivo",
  "Guias",
];

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

const EMPTY_FORM = { nome: "", email: "", telefone: "", empresa: "", category: "", subcategory: "" };

export function AdminCrmContacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [newContact, setNewContact] = useState({ ...EMPTY_FORM });
  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<CrmContact | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSyncUsers = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-users-to-crm");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({
        title: "Sincronização concluída!",
        description: `${data.imported} contatos importados/atualizados, ${data.skipped} ignorados.`,
      });
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["crm-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((c) => ({
        ...c,
        category: c.category ?? null,
        subcategory: c.subcategory ?? null,
      })) as CrmContact[];
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
    mutationFn: async (contact: typeof EMPTY_FORM) => {
      const { error } = await supabase.from("crm_contacts").insert({
        nome: contact.nome,
        email: contact.email,
        telefone: contact.telefone || null,
        empresa: contact.empresa || null,
        category: contact.category || null,
        subcategory: contact.subcategory || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({ title: "Contato adicionado!" });
      setAddOpen(false);
      setNewContact({ ...EMPTY_FORM });
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
          category: contact.category || null,
          subcategory: contact.subcategory || null,
        } as any)
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
      const importedContacts = rows
        .filter((r) => r.email || r.Email)
        .map((r) => ({
          nome: r.nome || r.Nome || r.name || r.Name || "",
          email: r.email || r.Email || "",
          telefone: r.telefone || r.Telefone || r.phone || r.Phone || null,
          empresa: r.empresa || r.Empresa || r.company || r.Company || null,
          origem: "importacao",
        }));
      if (importedContacts.length === 0) {
        toast({ title: "Nenhum contato válido encontrado", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("crm_contacts").insert(importedContacts);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast({ title: `${importedContacts.length} contatos importados!` });
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

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.empresa || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.subcategory || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Reusable category/subcategory fields
  const renderCategoryFields = (
    category: string,
    subcategory: string,
    onCategoryChange: (val: string) => void,
    onSubcategoryChange: (val: string) => void
  ) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label>Categoria *</Label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Selecione a categoria</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Subcategoria</Label>
        <Input
          value={subcategory}
          onChange={(e) => onSubcategoryChange(e.target.value)}
          placeholder="Ex: Luxo, Corporativo, Regional..."
          className="mt-1"
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Contatos ({contacts.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSyncUsers} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Importar Usuários para CRM
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileImport} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Importar CSV/Excel
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Novo Contato
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email, empresa ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-[200px]"
          >
            <option value="all">Todas as categorias</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
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
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                <TableHead className="hidden lg:table-cell">Subcategoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Origem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => (
                <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditContact({ ...contact }); setEditOpen(true); }}>
                  <TableCell className="font-medium">{contact.nome}</TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell className="hidden md:table-cell">{contact.empresa || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {contact.category ? (
                      <Badge variant="outline" className="text-xs">{contact.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {contact.subcategory ? (
                      <Badge variant="secondary" className="text-xs">{contact.subcategory}</Badge>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${STATUS_COLORS[contact.status] || ""} text-white`}>
                      {STATUS_LABELS[contact.status] || contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize hidden md:table-cell">{contact.origem || "manual"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openSendModal(contact); }} title="Enviar email">
                        <Send className="h-4 w-4" />
                      </Button>
                      <ConfirmDeleteDialog onConfirm={() => deleteContactMutation.mutate(contact.id)}>
                        <Button size="icon" variant="ghost" className="text-destructive" title="Excluir" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDeleteDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
            <DialogDescription>Preencha os dados do novo contato.</DialogDescription>
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
            {renderCategoryFields(
              newContact.category,
              newContact.subcategory,
              (val) => setNewContact({ ...newContact, category: val }),
              (val) => setNewContact({ ...newContact, subcategory: val })
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => addContactMutation.mutate(newContact)} disabled={!newContact.nome || !newContact.email || !newContact.category || addContactMutation.isPending}>
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
            <DialogDescription>Selecione um template ou escreva a mensagem.</DialogDescription>
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
                    <SelectItem key={t.id} value={t.id}>{t.nome_template}</SelectItem>
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

      {/* Edit Contact Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditContact(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>Atualize os dados do contato.</DialogDescription>
          </DialogHeader>
          {editContact && (
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={editContact.nome} onChange={(e) => setEditContact({ ...editContact, nome: e.target.value })} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={editContact.email} onChange={(e) => setEditContact({ ...editContact, email: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={editContact.telefone || ""} onChange={(e) => setEditContact({ ...editContact, telefone: e.target.value })} />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input value={editContact.empresa || ""} onChange={(e) => setEditContact({ ...editContact, empresa: e.target.value })} />
              </div>
              {renderCategoryFields(
                editContact.category || "",
                editContact.subcategory || "",
                (val) => setEditContact({ ...editContact, category: val }),
                (val) => setEditContact({ ...editContact, subcategory: val })
              )}
              <div>
                <Label>Status</Label>
                <select
                  value={editContact.status}
                  onChange={(e) => setEditContact({ ...editContact, status: e.target.value })}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Origem</Label>
                <Input value={editContact.origem || ""} onChange={(e) => setEditContact({ ...editContact, origem: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditContact(null); }}>Cancelar</Button>
            <Button
              onClick={() => editContact && updateContactMutation.mutate(editContact)}
              disabled={!editContact?.nome || !editContact?.email || !editContact?.category || updateContactMutation.isPending}
            >
              {updateContactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
