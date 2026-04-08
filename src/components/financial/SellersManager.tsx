import { useState } from "react";
import { Plus, Trash2, Pencil, Users, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSellers } from "@/hooks/useSellers";

export function SellersManager() {
  const { sellers, createSeller, updateSeller, deleteSeller } = useSellers();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [commission, setCommission] = useState(10);

  const reset = () => { setName(""); setCommission(10); setEditingId(null); };

  const openEdit = (s: typeof sellers[0]) => {
    setEditingId(s.id);
    setName(s.name);
    setCommission(s.default_commission_percent);
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (editingId) {
      await updateSeller.mutateAsync({ id: editingId, name, default_commission_percent: commission });
    } else {
      await createSeller.mutateAsync({ name, default_commission_percent: commission });
    }
    setIsOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteSeller.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Vendedores</h3>
        </div>
        <Button size="sm" onClick={() => { reset(); setIsOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {sellers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Nenhum vendedor cadastrado. Cadastre para controlar comissões por pessoa.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => (
            <Card key={s.id} className="group">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3" /> {s.default_commission_percent}% comissão padrão
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João" />
            </div>
            <div className="space-y-2">
              <Label>Comissão padrão (%)</Label>
              <Input type="number" value={commission} onChange={(e) => setCommission(Number(e.target.value))} placeholder="10" min={0} max={100} step={0.5} />
              <p className="text-xs text-muted-foreground">Valor sugerido ao selecionar este vendedor em uma venda</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsOpen(false); reset(); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!name || createSeller.isPending || updateSeller.isPending}>
              {editingId ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vendedor?</AlertDialogTitle>
            <AlertDialogDescription>O vendedor será desativado. Vendas existentes não serão afetadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}