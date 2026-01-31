import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinancial } from "@/hooks/useFinancial";
import type { CustomerPaymentFormData, SupplierPaymentFormData } from "@/types/financial";
import { PAYMENT_METHODS } from "@/types/financial";

export function CashFlowManager() {
  const { 
    sales,
    customerPayments, 
    supplierPayments, 
    createCustomerPayment, 
    deleteCustomerPayment,
    createSupplierPayment,
    deleteSupplierPayment,
    isCreating 
  } = useFinancial();
  
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [deleteSupplierId, setDeleteSupplierId] = useState<string | null>(null);
  
  const [customerFormData, setCustomerFormData] = useState<CustomerPaymentFormData>({
    sale_id: "",
    amount: 0,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "pix",
    notes: "",
  });
  
  const [supplierFormData, setSupplierFormData] = useState<SupplierPaymentFormData>({
    supplier_name: "",
    amount: 0,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "pix",
    notes: "",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate daily and monthly balances
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const todayCustomer = customerPayments
    .filter(p => p.payment_date === today)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const todaySupplier = supplierPayments
    .filter(p => p.payment_date === today)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const monthCustomer = customerPayments
    .filter(p => p.payment_date >= monthStartStr)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
  const monthSupplier = supplierPayments
    .filter(p => p.payment_date >= monthStartStr)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const handleCustomerSubmit = async () => {
    await createCustomerPayment(customerFormData);
    setIsCustomerDialogOpen(false);
    setCustomerFormData({
      sale_id: "",
      amount: 0,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "pix",
      notes: "",
    });
  };

  const handleSupplierSubmit = async () => {
    await createSupplierPayment(supplierFormData);
    setIsSupplierDialogOpen(false);
    setSupplierFormData({
      supplier_name: "",
      amount: 0,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "pix",
      notes: "",
    });
  };

  const handleDeleteCustomer = async () => {
    if (deleteCustomerId) {
      await deleteCustomerPayment(deleteCustomerId);
      setDeleteCustomerId(null);
    }
  };

  const handleDeleteSupplier = async () => {
    if (deleteSupplierId) {
      await deleteSupplierPayment(deleteSupplierId);
      setDeleteSupplierId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recebido Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(todayCustomer)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pago Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(todaySupplier)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${todayCustomer - todaySupplier >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(todayCustomer - todaySupplier)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthCustomer - monthSupplier >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(monthCustomer - monthSupplier)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recebimentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recebimentos" className="gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Recebimentos
          </TabsTrigger>
          <TabsTrigger value="pagamentos" className="gap-2">
            <ArrowDownCircle className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
        </TabsList>

        {/* Customer Payments Tab */}
        <TabsContent value="recebimentos" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recebimentos de Clientes</h3>
            <Button onClick={() => setIsCustomerDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Recebimento
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum recebimento registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  customerPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {payment.sale?.client_name || "-"} - {payment.sale?.destination || "-"}
                      </TableCell>
                      <TableCell>
                        {PAYMENT_METHODS[payment.payment_method] || payment.payment_method}
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {formatCurrency(Number(payment.amount))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteCustomerId(payment.id)}
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
        </TabsContent>

        {/* Supplier Payments Tab */}
        <TabsContent value="pagamentos" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pagamentos a Fornecedores</h3>
            <Button onClick={() => setIsSupplierDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pagamento
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum pagamento registrado
                    </TableCell>
                  </TableRow>
                ) : (
                  supplierPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{payment.supplier_name}</TableCell>
                      <TableCell>
                        {PAYMENT_METHODS[payment.payment_method] || payment.payment_method}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {formatCurrency(Number(payment.amount))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteSupplierId(payment.id)}
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
        </TabsContent>
      </Tabs>

      {/* Customer Payment Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Venda Vinculada</Label>
              <Select
                value={customerFormData.sale_id}
                onValueChange={(v) => setCustomerFormData({ ...customerFormData, sale_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a venda" />
                </SelectTrigger>
                <SelectContent>
                  {sales.map((sale) => (
                    <SelectItem key={sale.id} value={sale.id}>
                      {sale.client_name} - {sale.destination} ({formatCurrency(Number(sale.sale_amount))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={customerFormData.amount}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, amount: Number(e.target.value) })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={customerFormData.payment_date}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, payment_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={customerFormData.payment_method}
                onValueChange={(v) => setCustomerFormData({ ...customerFormData, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={customerFormData.notes || ""}
                onChange={(e) => setCustomerFormData({ ...customerFormData, notes: e.target.value })}
                placeholder="Observações opcionais"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCustomerSubmit} 
              disabled={isCreating || !customerFormData.sale_id || customerFormData.amount <= 0}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Payment Dialog */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Pagamento a Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Fornecedor</Label>
              <Input
                value={supplierFormData.supplier_name}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, supplier_name: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={supplierFormData.amount}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, amount: Number(e.target.value) })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={supplierFormData.payment_date}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, payment_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select
                value={supplierFormData.payment_method}
                onValueChange={(v) => setSupplierFormData({ ...supplierFormData, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={supplierFormData.notes || ""}
                onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                placeholder="Observações opcionais"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSupplierSubmit} 
              disabled={isCreating || !supplierFormData.supplier_name || supplierFormData.amount <= 0}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmations */}
      <AlertDialog open={!!deleteCustomerId} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recebimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSupplierId} onOpenChange={() => setDeleteSupplierId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
