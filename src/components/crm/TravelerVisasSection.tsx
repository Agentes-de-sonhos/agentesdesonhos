import { useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTravelerVisas, type TravelerVisa } from "@/hooks/useTravelerVisas";
import { VISA_TYPES, documentStatus, formatBrDate } from "@/lib/documentExpiry";

export function TravelerVisasSection({ travelerId }: { travelerId: string }) {
  const { visas, isLoading, createVisa, updateVisa, deleteVisa, isSaving } = useTravelerVisas(travelerId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TravelerVisa | null>(null);
  const [tipo, setTipo] = useState<string>(VISA_TYPES[0]);
  const [tipoLivre, setTipoLivre] = useState("");
  const [numero, setNumero] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const openCreate = () => {
    setEditing(null);
    setTipo(VISA_TYPES[0]);
    setTipoLivre("");
    setNumero("");
    setVencimento("");
    setObservacoes("");
    setOpen(true);
  };

  const openEdit = (v: TravelerVisa) => {
    setEditing(v);
    const known = (VISA_TYPES as readonly string[]).includes(v.tipo);
    setTipo(known ? v.tipo : "Outro visto");
    setTipoLivre(known ? "" : v.tipo);
    setNumero(v.numero ?? "");
    setVencimento(v.data_vencimento ?? "");
    setObservacoes(v.observacoes ?? "");
    setOpen(true);
  };

  const handleSave = async () => {
    const finalTipo = tipo === "Outro visto" && tipoLivre.trim() ? tipoLivre.trim() : tipo;
    const payload = {
      tipo: finalTipo,
      numero: numero.trim() || null,
      data_vencimento: vencimento || null,
      observacoes: observacoes.trim() || null,
    };
    if (editing) await updateVisa({ id: editing.id, ...payload });
    else await createVisa(payload);
    setOpen(false);
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Vistos {visas.length > 0 && <span className="text-muted-foreground">({visas.length})</span>}
        </p>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar visto
        </Button>
      </div>

      {isLoading ? (
        <p className="py-2 text-sm text-muted-foreground">Carregando...</p>
      ) : visas.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          Nenhum visto cadastrado. Inclua o visto e a data de vencimento para receber os avisos.
        </p>
      ) : (
        <ul className="space-y-2">
          {visas.map((v) => {
            const status = documentStatus(v.data_vencimento);
            return (
              <li key={v.id} className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{v.tipo}</span>
                    {status && (
                      <Badge className={`text-[10px] ${status.className}`} variant="secondary">
                        {status.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vence em {formatBrDate(v.data_vencimento)}
                    {v.numero ? ` • nº ${v.numero}` : ""}
                  </p>
                  {v.observacoes && <p className="text-xs text-muted-foreground">{v.observacoes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)} aria-label="Editar visto">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteVisa(v.id)}
                    aria-label="Remover visto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar visto" : "Novo visto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Tipo de visto</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISA_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tipo === "Outro visto" && (
              <div>
                <Label>Nome do visto</Label>
                <Input value={tipoLivre} onChange={(e) => setTipoLivre(e.target.value)} placeholder="Ex.: Visto Sul-Africano" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Número (opcional)</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
