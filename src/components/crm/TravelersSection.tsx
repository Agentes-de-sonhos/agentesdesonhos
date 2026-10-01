import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, Plus, Pencil, Trash2, FileUp, Download, Eye, X,
  User, CreditCard, Globe, Calendar, StickyNote, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTravelers, useTravelerDocuments, getTravelerDocumentSignedUrl, type Traveler } from "@/hooks/useTravelers";
import { useToast } from "@/hooks/use-toast";
import { TravelerVisasSection } from "@/components/crm/TravelerVisasSection";

interface TravelersSectionProps {
  clientId: string;
  clientName: string;
}

const DOCUMENT_TYPES = [
  { value: "passaporte", label: "Passaporte" },
  { value: "rg", label: "RG" },
  { value: "cpf", label: "CPF" },
  { value: "visto", label: "Visto" },
  { value: "vacina", label: "Carteira de Vacina" },
  { value: "outros", label: "Outros" },
];

export function TravelersSection({ clientId, clientName }: TravelersSectionProps) {
  const { travelers, isLoading, createTraveler, updateTraveler, deleteTraveler, isCreating } = useTravelers(clientId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<Traveler | null>(null);
  const [expandedTraveler, setExpandedTraveler] = useState<string | null>(null);
  const [initialTab, setInitialTab] = useState<"dados" | "docs">("dados");

  const handleOpenCreate = () => {
    setEditingTraveler(null);
    setInitialTab("dados");
    setFormOpen(true);
  };

  const handleOpenEdit = (t: Traveler, tab: "dados" | "docs" = "dados") => {
    setEditingTraveler(t);
    setInitialTab(tab);
    setFormOpen(true);
  };

  const handleSave = async (data: any) => {
    if (editingTraveler) {
      await updateTraveler({ id: editingTraveler.id, ...data });
      setFormOpen(false);
      setEditingTraveler(null);
    } else {
      // Mantém o pop-up aberto e libera a aba de documentos do novo viajante.
      const created = await createTraveler({ ...data, client_id: clientId });
      if (created) {
        setInitialTab("docs");
        setEditingTraveler(created);
      }
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return d; }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Documentos / Acompanhantes
        </CardTitle>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Viajante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <TravelerForm
              key={editingTraveler?.id ?? "new"}
              traveler={editingTraveler}
              onSave={handleSave}
              isSubmitting={isCreating}
              initialTab={initialTab}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Carregando...</p>
        ) : travelers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum viajante cadastrado</p>
            <p className="text-sm mt-1">Adicione familiares ou acompanhantes do cliente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {travelers.map((t) => (
              <div key={t.id} className="border rounded-lg">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedTraveler(expandedTraveler === t.id ? null : t.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{t.nome_completo}</p>
                        {t.is_responsavel && (
                          <Badge variant="secondary" className="text-[10px]">Responsável</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {t.data_nascimento && <span>{formatDate(t.data_nascimento)}</span>}
                        {t.nacionalidade && <span>• {t.nacionalidade}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover viajante?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá {t.nome_completo} e todos os documentos associados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTraveler(t.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {expandedTraveler === t.id && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-4">
                    {/* Traveler details */}
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      {t.cpf && (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">CPF/Doc:</span>
                          <span>{t.cpf}</span>
                        </div>
                      )}
                      {t.passaporte && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Passaporte:</span>
                          <span>{t.passaporte}</span>
                        </div>
                      )}
                      {t.validade_passaporte && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Validade:</span>
                          <span>{formatDate(t.validade_passaporte)}</span>
                        </div>
                      )}
                    </div>
                    {t.observacoes && (
                      <div className="flex items-start gap-2 text-sm">
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                        <p className="text-muted-foreground">{t.observacoes}</p>
                      </div>
                    )}

                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(t, "docs")}>
                      <FileUp className="mr-1.5 h-3.5 w-3.5" /> Vistos e documentos
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TravelerForm({
  traveler,
  onSave,
  isSubmitting,
  initialTab = "dados",
}: {
  traveler: Traveler | null;
  onSave: (data: any) => Promise<void>;
  isSubmitting: boolean;
  initialTab?: "dados" | "docs";
}) {
  const [form, setForm] = useState({
    nome_completo: traveler?.nome_completo || "",
    data_nascimento: traveler?.data_nascimento || "",
    cpf: traveler?.cpf || "",
    passaporte: traveler?.passaporte || "",
    validade_passaporte: traveler?.validade_passaporte || "",
    nacionalidade: traveler?.nacionalidade || "",
    observacoes: traveler?.observacoes || "",
    is_responsavel: traveler?.is_responsavel || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...form,
      data_nascimento: form.data_nascimento || null,
      cpf: form.cpf || null,
      passaporte: form.passaporte || null,
      validade_passaporte: form.validade_passaporte || null,
      nacionalidade: form.nacionalidade || null,
      observacoes: form.observacoes || null,
    });
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{traveler ? "Editar Viajante" : "Novo Viajante"}</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue={initialTab} className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="docs">Documentos &amp; Vistos</TabsTrigger>
        </TabsList>
        <TabsContent value="dados">
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div>
          <Label>Nome Completo *</Label>
          <Input
            value={form.nome_completo}
            onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Data de Nascimento</Label>
            <Input
              type="date"
              value={form.data_nascimento}
              onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
            />
          </div>
          <div>
            <Label>Nacionalidade</Label>
            <Input
              value={form.nacionalidade}
              onChange={(e) => setForm({ ...form, nacionalidade: e.target.value })}
              placeholder="Ex: Brasileira"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>CPF / Documento</Label>
            <Input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            />
          </div>
          <div>
            <Label>Passaporte</Label>
            <Input
              value={form.passaporte}
              onChange={(e) => setForm({ ...form, passaporte: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Validade do Passaporte</Label>
          <Input
            type="date"
            value={form.validade_passaporte}
            onChange={(e) => setForm({ ...form, validade_passaporte: e.target.value })}
          />
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            rows={2}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.is_responsavel}
            onCheckedChange={(v) => setForm({ ...form, is_responsavel: v })}
          />
          <Label>Responsável principal</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || !form.nome_completo.trim()}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
        </TabsContent>
        <TabsContent value="docs" className="mt-4">
          {traveler ? (
            <TravelerDocsPanel travelerId={traveler.id} travelerName={traveler.nome_completo} />
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Salve os dados do viajante para adicionar vistos e documentos.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Vistos + upload de documentos de um viajante (mesmo bloco para titular e acompanhantes). */
export function TravelerDocsPanel({ travelerId, travelerName }: { travelerId: string; travelerName: string }) {
  return (
    <div className="space-y-4">
      <TravelerVisasSection travelerId={travelerId} />
      <TravelerDocumentsSection travelerId={travelerId} travelerName={travelerName} />
    </div>
  );
}

/**
 * Aba "Documentos & Vistos" do cadastro do cliente: usa o viajante titular
 * (is_responsavel) e cria-o sob demanda quando ainda não existe.
 */
export function ClientDocumentsPanel({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { travelers, isLoading, createTraveler, isCreating } = useTravelers(clientId);
  const holder =
    travelers.find((t) => t.is_responsavel) ??
    travelers.find((t) => t.nome_completo.trim().toLowerCase() === clientName.trim().toLowerCase());

  if (isLoading) return <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p>;

  if (!holder) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Para anexar vistos e documentos, ative o cadastro de documentos do titular.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={isCreating}
          onClick={() =>
            createTraveler({
              client_id: clientId,
              nome_completo: clientName,
              data_nascimento: null,
              cpf: null,
              passaporte: null,
              validade_passaporte: null,
              nacionalidade: null,
              observacoes: null,
              is_responsavel: true,
            })
          }
        >
          <Plus className="mr-1.5 h-4 w-4" /> Ativar documentos de {clientName}
        </Button>
      </div>
    );
  }

  return <TravelerDocsPanel travelerId={holder.id} travelerName={holder.nome_completo} />;
}

function TravelerDocumentsSection({ travelerId, travelerName }: { travelerId: string; travelerName: string }) {
  const { documents, isLoading, uploadDocument, deleteDocument, isUploading } = useTravelerDocuments(travelerId);
  const [tipoDoc, setTipoDoc] = useState("outros");
  const fileInputId = `file-${travelerId}`;
  const { toast } = useToast();

  const handleView = async (path: string) => {
    try {
      const url = await getTravelerDocumentSignedUrl(path);
      window.open(url, "_blank");
    } catch (e: any) {
      toast({ title: "Erro ao abrir documento", description: e.message, variant: "destructive" });
    }
  };

  const handleDownload = async (path: string, filename: string) => {
    try {
      const url = await getTravelerDocumentSignedUrl(path);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      toast({ title: "Erro ao baixar documento", description: e.message, variant: "destructive" });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDocument({ file, tipoDocumento: tipoDoc });
    e.target.value = "";
  };

  const getDocLabel = (tipo: string) =>
    DOCUMENT_TYPES.find((d) => d.value === tipo)?.label || tipo;

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4 text-primary" />
          Documentos {documents.length > 0 && <span className="text-muted-foreground">({documents.length})</span>}
        </p>
        <Button
          size="sm" variant="outline"
          disabled={isUploading}
          onClick={() => document.getElementById(fileInputId)?.click()}
        >
          <FileUp className="mr-1.5 h-3.5 w-3.5" />
          {isUploading ? "Enviando..." : "Enviar documento"}
        </Button>
        <input
          id={fileInputId}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
        />
      </div>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Tipo do próximo envio:</span>
        <Select value={tipoDoc} onValueChange={setTipoDoc}>
          <SelectTrigger className="h-8 w-[150px] bg-background text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {documents.length === 0 ? (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => document.getElementById(fileInputId)?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-md border border-dashed bg-background px-3 py-5 text-center transition-colors hover:border-primary/50"
        >
          <FileUp className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Clique para enviar um arquivo</span>
          <span className="text-xs text-muted-foreground">Passaporte, RG, vistos, vacinas (PDF, PNG ou JPG)</span>
        </button>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[10px] shrink-0">{getDocLabel(doc.tipo_documento)}</Badge>
                <span className="truncate">{doc.nome_arquivo}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => handleView(doc.arquivo_url)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => handleDownload(doc.arquivo_url, doc.nome_arquivo)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover documento?</AlertDialogTitle>
                      <AlertDialogDescription>O arquivo será removido permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteDocument(doc.id)}>Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
