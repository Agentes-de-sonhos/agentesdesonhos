import { useState, useMemo, useEffect } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, MapPin, User, Download, Loader2, ChevronDown, ChevronRight, Package, Pencil, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFinancial, useClosedOpportunities } from "@/hooks/useFinancial";
import { useSellers } from "@/hooks/useSellers";
import type { Sale, SaleFormData, SaleProductFormData, ProductType } from "@/types/financial";
import { PRODUCT_TYPES } from "@/types/financial";

export function SalesManager() {
  const { sales, saleProducts, createSale, updateSale, deleteSale, createSaleProduct, updateSaleProduct, deleteSaleProduct, isCreating, isUpdating } = useFinancial();
  const { closedOpportunities } = useClosedOpportunities();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>("client");
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SaleFormData>({
    client_name: "", destination: "", sale_amount: 0,
    sale_date: new Date().toISOString().split("T")[0], notes: "",
  });
  const defaultProductForm: SaleProductFormData = {
    product_type: "aereo", description: "", sale_price: 0,
    cost_price: 0, non_commissionable_taxes: 0, commission_type: "percentage", commission_value: 0,
    payment_rule: "after_sale", payment_days: 30, requires_invoice: false,
  };
  const [productFormData, setProductFormData] = useState<SaleProductFormData>(defaultProductForm);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const toggleSaleExpanded = (saleId: string) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) newExpanded.delete(saleId);
    else newExpanded.add(saleId);
    setExpandedSales(newExpanded);
  };

  const getProductsForSale = (saleId: string) => saleProducts.filter(p => p.sale_id === saleId);

  const calculateProductCommission = (product: typeof saleProducts[0]) => {
    const prodTaxes = Number((product as any).non_commissionable_taxes) || 0;
    const base = Number(product.sale_price) - prodTaxes;
    if (product.commission_type === 'percentage') return base * Number(product.commission_value) / 100;
    return Number(product.commission_value);
  };

  const calculateSaleTotalCommission = (saleId: string) => {
    const products = getProductsForSale(saleId);
    return products.reduce((sum, p) => sum + calculateProductCommission(p), 0);
  };

  const resetSaleForm = () => {
    setFormData({ client_name: "", destination: "", sale_amount: 0, sale_date: new Date().toISOString().split("T")[0], notes: "" });
    setEditingSaleId(null);
    setSelectedOpportunity("client");
  };

  const resetProductForm = () => {
    setProductFormData({ ...defaultProductForm });
    setEditingProductId(null);
  };

  const handleOpportunitySelect = (opportunityId: string) => {
    const opp = closedOpportunities.find(o => o.id === opportunityId);
    if (opp) {
      setFormData({
        client_name: opp.client?.name || "", destination: opp.destination,
        sale_amount: Number(opp.estimated_value), sale_date: new Date().toISOString().split("T")[0],
        notes: opp.notes || "", opportunity_id: opp.id,
      });
    }
  };

  const handleSubmit = async () => {
    if (editingSaleId) {
      await updateSale({ id: editingSaleId, ...formData });
    } else {
      await createSale(formData);
    }
    setIsDialogOpen(false);
    resetSaleForm();
  };

  const handleProductSubmit = async () => {
    if (!selectedSaleId && !editingProductId) return;
    if (editingProductId) {
      await updateSaleProduct({ id: editingProductId, ...productFormData });
    } else {
      await createSaleProduct({ saleId: selectedSaleId!, ...productFormData });
    }
    setIsProductDialogOpen(false);
    resetProductForm();
    setSelectedSaleId(null);
  };

  const openEditSale = (sale: Sale) => {
    setEditingSaleId(sale.id);
    setFormData({
      client_name: sale.client_name, destination: sale.destination,
      sale_amount: Number(sale.sale_amount), sale_date: sale.sale_date,
      notes: sale.notes || "", opportunity_id: sale.opportunity_id || undefined,
    });
    setIsDialogOpen(true);
  };

  const openEditProduct = (product: typeof saleProducts[0]) => {
    setEditingProductId(product.id);
    setProductFormData({
      product_type: product.product_type, description: product.description || "",
      sale_price: Number(product.sale_price), cost_price: Number(product.cost_price),
      non_commissionable_taxes: Number((product as any).non_commissionable_taxes) || 0,
      commission_type: product.commission_type, commission_value: Number(product.commission_value),
      supplier_name: (product as any).supplier_name || "",
      payment_rule: (product as any).payment_rule || "after_sale",
      payment_days: (product as any).payment_days || 30,
      expected_date: (product as any).expected_date || "",
      requires_invoice: (product as any).requires_invoice || false,
      invoice_status: (product as any).invoice_status || "a_emitir",
      invoice_number: (product as any).invoice_number || "",
      invoice_issued_date: (product as any).invoice_issued_date || "",
      invoice_sent_date: (product as any).invoice_sent_date || "",
    });
    setIsProductDialogOpen(true);
  };

  const openAddProduct = (saleId: string) => {
    setSelectedSaleId(saleId);
    resetProductForm();
    setIsProductDialogOpen(true);
  };

  const handleDelete = async () => { if (deleteId) { await deleteSale(deleteId); setDeleteId(null); } };
  const handleDeleteProduct = async () => { if (deleteProductId) { await deleteSaleProduct(deleteProductId); setDeleteProductId(null); } };

  const importedOpportunityIds = sales.map(s => s.opportunity_id).filter(Boolean);
  const availableOpportunities = closedOpportunities.filter(o => !importedOpportunityIds.includes(o.id));
  const isSaving = isCreating || isUpdating;
  const taxes = Number(productFormData.non_commissionable_taxes) || 0;
  const commissionBase = (Number(productFormData.sale_price) || 0) - taxes;
  const estimatedCommission = productFormData.commission_type === "percentage"
    ? commissionBase * (Number(productFormData.commission_value) || 0) / 100
    : Number(productFormData.commission_value) || 0;

  // Auto-calculate expected_date based on payment_rule
  const currentSaleForProduct = useMemo(() => {
    if (editingProductId) {
      const product = saleProducts.find(p => p.id === editingProductId);
      return product ? sales.find(s => s.id === product.sale_id) : null;
    }
    return selectedSaleId ? sales.find(s => s.id === selectedSaleId) : null;
  }, [editingProductId, selectedSaleId, sales, saleProducts]);

  useEffect(() => {
    if (productFormData.payment_rule === "manual") return;

    let baseDate: string | null = null;
    const rule = productFormData.payment_rule;

    if (rule === "after_sale" && currentSaleForProduct?.sale_date) {
      baseDate = currentSaleForProduct.sale_date;
    } else if (rule === "after_travel" && currentSaleForProduct) {
      baseDate = (currentSaleForProduct as any).end_date || currentSaleForProduct.sale_date;
    } else if (rule === "after_invoice_issued" && productFormData.invoice_issued_date) {
      baseDate = productFormData.invoice_issued_date;
    } else if (rule === "after_invoice_sent" && productFormData.invoice_sent_date) {
      baseDate = productFormData.invoice_sent_date;
    }

    if (baseDate) {
      const [y, m, d] = baseDate.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const expected = addDays(date, Number(productFormData.payment_days) || 0);
      const formatted = format(expected, "yyyy-MM-dd");
      if (formatted !== productFormData.expected_date) {
        setProductFormData(prev => ({ ...prev, expected_date: formatted }));
      }
    }
  }, [
    productFormData.payment_rule,
    productFormData.payment_days,
    productFormData.invoice_issued_date,
    productFormData.invoice_sent_date,
    currentSaleForProduct,
  ]);

  const renderSectionHeader = (step: number, title: string, description: string) => (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {step}
        </span>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Vendas</h3>
        <Button onClick={() => { resetSaleForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Venda
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
          <div className="border rounded-lg p-8 text-center text-muted-foreground">Nenhuma venda registrada</div>
        ) : (
          sales.map((sale) => {
            const products = getProductsForSale(sale.id);
            const isExpanded = expandedSales.has(sale.id);
            const totalCommission = calculateSaleTotalCommission(sale.id);

            return (
              <Collapsible key={sale.id} open={isExpanded} onOpenChange={() => toggleSaleExpanded(sale.id)}>
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-4">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{sale.client_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" /> {sale.destination}
                            <span className="mx-2">•</span>
                            {format(new Date(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(Number(sale.sale_amount))}</div>
                          {products.length > 0 && (
                            <div className="text-sm text-primary">Comissão: {formatCurrency(totalCommission)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{products.length} produto(s)</span>
                          <Button
                            variant={products.length === 0 ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={(e) => { e.stopPropagation(); openAddProduct(sale.id); }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Produto
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditSale(sale); }}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(sale.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t bg-muted/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Produtos da Venda</h4>
                        <Button variant="outline" size="sm" onClick={() => openAddProduct(sale.id)}>
                          <Plus className="h-3 w-3 mr-1" /> Adicionar Produto
                        </Button>
                      </div>
                      
                      {products.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto cadastrado. Adicione produtos para calcular custos e comissões.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="text-right">Preço Venda</TableHead>
                              <TableHead className="text-right">Comissão</TableHead>
                              <TableHead>Fornecedor</TableHead>
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {products.map((product) => {
                              const commission = calculateProductCommission(product);
                              return (
                                <TableRow key={product.id}>
                                  <TableCell className="font-medium">{PRODUCT_TYPES[product.product_type]}</TableCell>
                                  <TableCell className="text-muted-foreground">{product.description || "-"}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(Number(product.sale_price))}</TableCell>
                                  <TableCell className="text-right text-primary">
                                    {formatCurrency(commission)}
                                    {product.commission_type === 'percentage' && <span className="text-xs text-muted-foreground ml-1">({product.commission_value}%)</span>}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{(product as any).supplier_name || "-"}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-0.5">
                                      <Button variant="ghost" size="icon" onClick={() => openEditProduct(product)}>
                                        <Pencil className="h-3 w-3 text-muted-foreground" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => setDeleteProductId(product.id)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
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

      {/* Sale Dialog (Create/Edit) */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetSaleForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSaleId ? "Editar Venda" : "Nova Venda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingSaleId && (
              <div className="space-y-3">
                <Label>Origem da Venda</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedOpportunity("client"); setFormData({ ...formData, opportunity_id: undefined }); }}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${selectedOpportunity !== "opportunity" ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-muted-foreground/30"}`}
                  >
                    <User className="h-4 w-4" /> Selecionar Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOpportunity("opportunity")}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${selectedOpportunity === "opportunity" ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-muted-foreground/30"}`}
                  >
                    <Download className="h-4 w-4" /> Importar de Oportunidade
                  </button>
                </div>

                {selectedOpportunity === "opportunity" && (
                  <div className="space-y-2">
                    <Label>Oportunidade</Label>
                    {availableOpportunities.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">Nenhuma oportunidade fechada disponível para importar.</p>
                    ) : (
                      <Select value={formData.opportunity_id || ""} onValueChange={(id) => handleOpportunitySelect(id)}>
                        <SelectTrigger><SelectValue placeholder="Selecione uma oportunidade" /></SelectTrigger>
                        <SelectContent>
                          {availableOpportunities.map((opp) => (
                            <SelectItem key={opp.id} value={opp.id}>{opp.client?.name} - {opp.destination}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Input value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} placeholder="Nome do cliente" />
              </div>
              <div className="space-y-2">
                <Label>Destino</Label>
                <Input value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} placeholder="Destino da viagem" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor Total da Venda</Label>
                <Input type="number" value={formData.sale_amount} onChange={(e) => setFormData({ ...formData, sale_amount: Number(e.target.value) })} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Data da Venda</Label>
                <Input type="date" value={formData.sale_date} onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observações opcionais" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetSaleForm(); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving || !formData.client_name || !formData.destination}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingSaleId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog (Create/Edit) */}
      <Dialog open={isProductDialogOpen} onOpenChange={(open) => { setIsProductDialogOpen(open); if (!open) resetProductForm(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{editingProductId ? "Editar Produto" : "Adicionar Produto"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="dados" className="flex flex-col flex-1 min-h-0">
            <TabsList className="mx-6 mt-2 grid w-auto grid-cols-3">
              <TabsTrigger value="dados">Dados do Produto</TabsTrigger>
              <TabsTrigger value="comissao">Comissão e Cálculo</TabsTrigger>
              <TabsTrigger value="recebimento">Recebimento e NF</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0 px-6 py-4">
              <TabsContent value="dados" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo de Produto</Label>
                    <Select value={productFormData.product_type} onValueChange={(v) => setProductFormData({ ...productFormData, product_type: v as ProductType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(PRODUCT_TYPES).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input value={productFormData.description || ""} onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })} placeholder="Ex: Hotel XYZ, 5 noites" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="comissao" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Preço de Venda *</Label>
                    <Input type="number" value={productFormData.sale_price} onChange={(e) => setProductFormData({ ...productFormData, sale_price: Number(e.target.value) })} placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Taxas / valores não comissionáveis</Label>
                    <Input type="number" value={productFormData.non_commissionable_taxes || ""} onChange={(e) => setProductFormData({ ...productFormData, non_commissionable_taxes: Number(e.target.value) })} placeholder="0,00 (opcional)" />
                    <p className="text-xs text-muted-foreground">Taxas, impostos ou valores que não entram na base de comissão</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo de Comissão</Label>
                    <Select value={productFormData.commission_type} onValueChange={(v) => setProductFormData({ ...productFormData, commission_type: v as 'percentage' | 'fixed' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{productFormData.commission_type === 'percentage' ? 'Comissão (%)' : 'Comissão (R$)'}</Label>
                    <Input type="number" value={productFormData.commission_value} onChange={(e) => setProductFormData({ ...productFormData, commission_value: Number(e.target.value) })} placeholder="0" />
                  </div>
                </div>
                <div className="grid gap-3 rounded-lg border border-dashed border-border bg-background/80 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Preço de venda</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(productFormData.sale_price) || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Base comissionável</p>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(commissionBase)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Comissão estimada</p>
                    <p className="text-sm font-semibold text-primary">{formatCurrency(estimatedCommission)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="recebimento" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Input value={productFormData.supplier_name || ""} onChange={(e) => setProductFormData({ ...productFormData, supplier_name: e.target.value })} placeholder="Nome do fornecedor" />
                  </div>
                  <div className="space-y-2">
                    <Label>Regra de recebimento</Label>
                    <Select value={productFormData.payment_rule} onValueChange={(v) => setProductFormData({ ...productFormData, payment_rule: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="after_sale">Após a venda</SelectItem>
                        <SelectItem value="after_travel">Após a viagem</SelectItem>
                        <SelectItem value="after_invoice_issued">Após emissão da NF</SelectItem>
                        <SelectItem value="after_invoice_sent">Após envio da NF</SelectItem>
                        <SelectItem value="manual">Data manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Prazo em dias</Label>
                    <Input type="number" value={productFormData.payment_days} onChange={(e) => setProductFormData({ ...productFormData, payment_days: Number(e.target.value) })} placeholder="30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data prevista de recebimento</Label>
                    <Input type="date" value={productFormData.expected_date || ""} onChange={(e) => setProductFormData({ ...productFormData, expected_date: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Calculada automaticamente ou informe manualmente</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="requires_invoice"
                    checked={productFormData.requires_invoice}
                    onCheckedChange={(checked) => setProductFormData({ ...productFormData, requires_invoice: !!checked })}
                  />
                  <Label htmlFor="requires_invoice" className="text-sm font-medium cursor-pointer">Exige nota fiscal?</Label>
                </div>

                {productFormData.requires_invoice && (
                  <div className="space-y-4 rounded-lg border border-dashed border-border bg-background/80 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <FileText className="h-4 w-4" /> Dados da Nota Fiscal
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Status da Nota</Label>
                        <Select value={productFormData.invoice_status || "a_emitir"} onValueChange={(v) => setProductFormData({ ...productFormData, invoice_status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="a_emitir">A emitir</SelectItem>
                            <SelectItem value="emitida">Emitida</SelectItem>
                            <SelectItem value="enviada">Enviada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Número da Nota</Label>
                        <Input value={productFormData.invoice_number || ""} onChange={(e) => setProductFormData({ ...productFormData, invoice_number: e.target.value })} placeholder="Nº da NF" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Data de Emissão</Label>
                        <Input type="date" value={productFormData.invoice_issued_date || ""} onChange={(e) => setProductFormData({ ...productFormData, invoice_issued_date: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Envio</Label>
                        <Input type="date" value={productFormData.invoice_sent_date || ""} onChange={(e) => setProductFormData({ ...productFormData, invoice_sent_date: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="px-6 pb-6 pt-2 border-t">
            <Button variant="outline" onClick={() => { setIsProductDialogOpen(false); resetProductForm(); }}>Cancelar</Button>
            <Button onClick={handleProductSubmit} disabled={isSaving || productFormData.sale_price <= 0}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProductId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os produtos e pagamentos vinculados também serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
