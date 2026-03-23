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
import { useTravelers, useTravelerDocuments, type Traveler } from "@/hooks/useTravelers";

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

  const handleOpenCreate = () => {
    setEditingTraveler(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (t: Traveler) => {
    setEditingTraveler(t);
    setFormOpen(true);
  };

  const handleSave = async (data: any) => {
    if (editingTraveler) {
      await updateTraveler({ id: editingTraveler.id, ...data });
    } else {
      await createTraveler({ ...data, client_id: clientId });
    }
    setFormOpen(false);
    setEditingTraveler(null);
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
          Viajantes / Acompanhantes
        </CardTitle>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Viajante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <TravelerForm
              traveler={editingTraveler}
              onSave={handleSave}
              isSubmitting={isCreating}
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

                    {/* Documents sub-section */}
                    <TravelerDocumentsSection travelerId={t.id} travelerName={t.nome_completo} />
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
}: {
  traveler: Traveler | null;
  onSave: (data: any) => Promise<void>;
  isSubmitting: boolean;
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
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{traveler ? "Editar Viajante" : "Novo Viajante"}</DialogTitle>
      </DialogHeader>
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
  );
}

function TravelerDocumentsSection({ travelerId, travelerName }: { travelerId: string; travelerName: string }) {
  const { documents, isLoading, uploadDocument, deleteDocument, isUploading } = useTravelerDocuments(travelerId);
  const [tipoDoc, setTipoDoc] = useState("outros");
  const fileInputId = `file-${travelerId}`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDocument({ file, tipoDocumento: tipoDoc });
    e.target.value = "";
  };

  const getDocLabel = (tipo: string) =>
    DOCUMENT_TYPES.find((d) => d.value === tipo)?.label || tipo;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" /> Documentos
        </h4>
        <div className="flex items-center gap-2">
          <Select value={tipoDoc} onValueChange={setTipoDoc}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm" variant="outline" className="h-8"
            disabled={isUploading}
            onClick={() => document.getElementById(fileInputId)?.click()}
          >
            <FileUp className="mr-1 h-3.5 w-3.5" />
            {isUploading ? "Enviando..." : "Upload"}
          </Button>
          <input
            id={fileInputId}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum documento</p>
      ) : (
        <div className="space-y-1.5">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-2 rounded border text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[10px] shrink-0">{getDocLabel(doc.tipo_documento)}</Badge>
                <span className="truncate">{doc.nome_arquivo}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => window.open(doc.arquivo_url, "_blank")}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <a href={doc.arquivo_url} download={doc.nome_arquivo}>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </a>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
