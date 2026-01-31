import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, MapPin, User, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinancial, useClosedOpportunities } from "@/hooks/useFinancial";
import type { Sale, SaleFormData } from "@/types/financial";

export function SalesManager() {
  const { sales, createSale, deleteSale, isCreating } = useFinancial();
  const { closedOpportunities } = useClosedOpportunities();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>("");
  const [formData, setFormData] = useState<SaleFormData>({
    client_name: "",
    destination: "",
    sale_amount: 0,
    sale_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleOpportunitySelect = (opportunityId: string) => {
    setSelectedOpportunity(opportunityId);
    if (opportunityId === "manual") {
      setFormData({
        client_name: "",
        destination: "",
        sale_amount: 0,
        sale_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    } else {
      const opp = closedOpportunities.find(o => o.id === opportunityId);
      if (opp) {
        setFormData({
          client_name: opp.client?.name || "",
          destination: opp.destination,
          sale_amount: Number(opp.estimated_value),
          sale_date: new Date().toISOString().split("T")[0],
          notes: opp.notes || "",
          opportunity_id: opp.id,
        });
      }
    }
  };

  const handleSubmit = async () => {
    await createSale(formData);
    setIsDialogOpen(false);
    setFormData({
      client_name: "",
      destination: "",
      sale_amount: 0,
      sale_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setSelectedOpportunity("");
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteSale(deleteId);
      setDeleteId(null);
    }
  };

  // Check which opportunities are already imported
  const importedOpportunityIds = sales.map(s => s.opportunity_id).filter(Boolean);
  const availableOpportunities = closedOpportunities.filter(
    o => !importedOpportunityIds.includes(o.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Vendas</h3>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Venda
        </Button>
      </div>

      {availableOpportunities.length > 0 && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            <Download className="h-4 w-4 inline mr-1" />
            {availableOpportunities.length} oportunidade(s) fechada(s) disponível(is) para importar
          </p>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma venda registrada
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {sale.client_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {sale.destination}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(sale.sale_amount))}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(sale.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {availableOpportunities.length > 0 && (
              <div className="space-y-2">
                <Label>Importar de Oportunidade</Label>
                <Select value={selectedOpportunity} onValueChange={handleOpportunitySelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione ou cadastre manualmente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Cadastro Manual</SelectItem>
                    {availableOpportunities.map((opp) => (
                      <SelectItem key={opp.id} value={opp.id}>
                        {opp.client?.name} - {opp.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label>Destino</Label>
                <Input
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="Destino da viagem"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor da Venda</Label>
                <Input
                  type="number"
                  value={formData.sale_amount}
                  onChange={(e) => setFormData({ ...formData, sale_amount: Number(e.target.value) })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data da Venda</Label>
                <Input
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações opcionais"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating || !formData.client_name || !formData.destination}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as entradas vinculadas também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
