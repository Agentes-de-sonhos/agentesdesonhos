import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, MapPin, User, Download, Loader2, ChevronDown, ChevronRight, Package } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFinancial, useClosedOpportunities } from "@/hooks/useFinancial";
import type { Sale, SaleFormData, SaleProductFormData, ProductType } from "@/types/financial";
import { PRODUCT_TYPES } from "@/types/financial";

export function SalesManager() {
  const { sales, saleProducts, createSale, deleteSale, createSaleProduct, deleteSaleProduct, isCreating } = useFinancial();
  const { closedOpportunities } = useClosedOpportunities();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>("");
  const [formData, setFormData] = useState<SaleFormData>({
    client_name: "",
    destination: "",
    sale_amount: 0,
    sale_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [productFormData, setProductFormData] = useState<SaleProductFormData>({
    product_type: "aereo",
    description: "",
    sale_price: 0,
    cost_price: 0,
    commission_type: "percentage",
    commission_value: 0,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const toggleSaleExpanded = (saleId: string) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedSales(newExpanded);
  };

  const getProductsForSale = (saleId: string) => {
    return saleProducts.filter(p => p.sale_id === saleId);
  };

  const calculateProductCommission = (product: typeof saleProducts[0]) => {
    if (product.commission_type === 'percentage') {
      return Number(product.sale_price) * Number(product.commission_value) / 100;
    }
    return Number(product.commission_value);
  };

  const calculateSaleProfit = (saleId: string) => {
    const products = getProductsForSale(saleId);
    const totalSale = products.reduce((sum, p) => sum + Number(p.sale_price), 0);
    const totalCost = products.reduce((sum, p) => sum + Number(p.cost_price), 0);
    const totalCommission = products.reduce((sum, p) => sum + calculateProductCommission(p), 0);
    return totalSale - totalCost - totalCommission;
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

  const handleProductSubmit = async () => {
    if (!selectedSaleId) return;
    await createSaleProduct({ saleId: selectedSaleId, ...productFormData });
    setIsProductDialogOpen(false);
    setProductFormData({
      product_type: "aereo",
      description: "",
      sale_price: 0,
      cost_price: 0,
      commission_type: "percentage",
      commission_value: 0,
    });
    setSelectedSaleId(null);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteSale(deleteId);
      setDeleteId(null);
    }
  };

  const handleDeleteProduct = async () => {
    if (deleteProductId) {
      await deleteSaleProduct(deleteProductId);
      setDeleteProductId(null);
    }
  };

  const openAddProduct = (saleId: string) => {
    setSelectedSaleId(saleId);
    setIsProductDialogOpen(true);
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

      <div className="space-y-2">
        {sales.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            Nenhuma venda registrada
          </div>
        ) : (
          sales.map((sale) => {
            const products = getProductsForSale(sale.id);
            const isExpanded = expandedSales.has(sale.id);
            const profit = calculateSaleProfit(sale.id);

            return (
              <Collapsible key={sale.id} open={isExpanded} onOpenChange={() => toggleSaleExpanded(sale.id)}>
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{sale.client_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {sale.destination}
                            <span className="mx-2">•</span>
                            {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(Number(sale.sale_amount))}</div>
                          {products.length > 0 && (
                            <div className={`text-sm ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                              Lucro: {formatCurrency(profit)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {products.length} produto(s)
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(sale.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t bg-muted/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Produtos da Venda
                        </h4>
                        <Button variant="outline" size="sm" onClick={() => openAddProduct(sale.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Produto
                        </Button>
                      </div>
                      
                      {products.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum produto cadastrado. Adicione produtos para calcular custos e comissões.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="text-right">Preço Venda</TableHead>
                              <TableHead className="text-right">Custo</TableHead>
                              <TableHead className="text-right">Comissão</TableHead>
                              <TableHead className="text-right">Lucro</TableHead>
                              <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products.map((product) => {
                              const commission = calculateProductCommission(product);
                              const productProfit = Number(product.sale_price) - Number(product.cost_price) - commission;
                              return (
                                <TableRow key={product.id}>
                                  <TableCell className="font-medium">
                                    {PRODUCT_TYPES[product.product_type]}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {product.description || "-"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(Number(product.sale_price))}
                                  </TableCell>
                                  <TableCell className="text-right text-destructive">
                                    {formatCurrency(Number(product.cost_price))}
                                  </TableCell>
                                  <TableCell className="text-right text-warning">
                                    {formatCurrency(commission)}
                                    {product.commission_type === 'percentage' && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        ({product.commission_value}%)
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${productProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {formatCurrency(productProfit)}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteProductId(product.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* New Sale Dialog */}
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
                <Label>Valor Total da Venda</Label>
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

      {/* Add Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de Produto</Label>
                <Select
                  value={productFormData.product_type}
                  onValueChange={(v) => setProductFormData({ ...productFormData, product_type: v as ProductType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRODUCT_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={productFormData.description || ""}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  placeholder="Ex: Hotel XYZ, 5 noites"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Preço de Venda</Label>
                <Input
                  type="number"
                  value={productFormData.sale_price}
                  onChange={(e) => setProductFormData({ ...productFormData, sale_price: Number(e.target.value) })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Custo (Fornecedor)</Label>
                <Input
                  type="number"
                  value={productFormData.cost_price}
                  onChange={(e) => setProductFormData({ ...productFormData, cost_price: Number(e.target.value) })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de Comissão</Label>
                <Select
                  value={productFormData.commission_type}
                  onValueChange={(v) => setProductFormData({ ...productFormData, commission_type: v as 'percentage' | 'fixed' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {productFormData.commission_type === 'percentage' ? 'Comissão (%)' : 'Comissão (R$)'}
                </Label>
                <Input
                  type="number"
                  value={productFormData.commission_value}
                  onChange={(e) => setProductFormData({ ...productFormData, commission_value: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleProductSubmit} disabled={isCreating || productFormData.sale_price <= 0}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sale Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os produtos e pagamentos vinculados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Product Confirmation */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
