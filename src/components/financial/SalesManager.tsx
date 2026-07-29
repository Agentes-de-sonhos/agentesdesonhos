import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, MapPin, User, Download, Loader2, ChevronDown, ChevronRight, Package, Pencil, FileText, FileSignature, Users, ShoppingBag, MoreHorizontal } from "lucide-react";
import { SaleContractDialog } from "@/components/financial/contracts/SaleContractDialog";
import { useFinancialExport } from "@/hooks/useFinancialExport";
import { ExportModal, type ExportFormat } from "@/components/financial/ExportModal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportFinancialData, prepareSalesExport } from "@/utils/financialExport";
import { SupplierSelector } from "@/components/financial/SupplierSelector";
import { useAgencySupplierTerms } from "@/hooks/useAgencySupplierTerms";
import { NewSaleWizard } from "@/components/financial/NewSaleWizard";
import { SaleFormDialog } from "@/components/financial/SaleFormDialog";
import { parseLocalDate } from "@/lib/dateParsing";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Sale, SaleFormData, SaleProductFormData, ProductType } from "@/types/financial";
import { PRODUCT_TYPES } from "@/types/financial";
import { isInMonth } from "@/utils/monthFilter";

export function SalesManager({ viewMonth, viewYear }: { viewMonth?: number; viewYear?: number } = {}) {
  const { sales: allSales, saleProducts, createSale, updateSale, deleteSale, createSaleProduct, updateSaleProduct, deleteSaleProduct, isCreating, isUpdating } = useFinancial();
  const sales = useMemo(() => {
    if (!viewMonth || !viewYear) return allSales;
    return allSales.filter(s => isInMonth(s.sale_date, viewMonth, viewYear));
  }, [allSales, viewMonth, viewYear]);
  const { closedOpportunities } = useClosedOpportunities();
  const { sellers } = useSellers();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: termsData } = useAgencySupplierTerms();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [contractSale, setContractSale] = useState<Sale | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const defaultProductForm: SaleProductFormData = {
    product_type: "aereo", description: "", sale_price: 0,
    cost_price: 0, non_commissionable_taxes: 0, commission_type: "percentage", commission_value: 0,
    payment_rule: "after_sale", payment_days: 30, requires_invoice: false,
    supplier_name: "", operator_id: null,
  };
  const [productFormData, setProductFormData] = useState<SaleProductFormData>(defaultProductForm);

  // Auto-open wizard when action=new. Depends on the primitive value so the
  // effect cannot re-run on every searchParams object identity change.
  const actionParam = searchParams.get("action");
  useEffect(() => {
    if (actionParam === "new") {
      setIsWizardOpen(true);
      setSearchParams({ tab: "vendas" }, { replace: true });
    }
  }, [actionParam, setSearchParams]);

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

  const resetProductForm = () => {
    setProductFormData({ ...defaultProductForm });
    setEditingProductId(null);
  };

  // Sync seller commission expense
  const syncSellerExpense = async (saleId: string, saleData: SaleFormData, selId: string, selComm: number) => {
    if (!user || !selId || selComm <= 0 || !saleData.sale_amount) return;
    const seller = sellers.find(s => s.id === selId);
    if (!seller) return;
    const commissionAmount = Number(saleData.sale_amount) * selComm / 100;
    if (commissionAmount <= 0) return;

    // Remove existing seller expense for this sale
    await supabase.from("expense_entries").delete().eq("sale_id", saleId).eq("category", "comissao").eq("user_id", user.id);

    // Create new expense with sale_id
    await supabase.from("expense_entries").insert({
      user_id: user.id,
      description: `Comissão - ${seller.name}`,
      category: "comissao",
      amount: commissionAmount,
      entry_date: saleData.sale_date,
      notes: `Comissão de ${selComm}% sobre venda de ${saleData.client_name}`,
      sale_id: saleId,
    });

    queryClient.invalidateQueries({ queryKey: ["expense_entries"] });
  };

  const handleSubmit = async (
    formData: SaleFormData,
    sellerId: string,
    sellerCommission: number,
  ) => {
    if (editingSaleId) {
      await updateSale({ id: editingSaleId, ...formData, seller_id: sellerId || null, seller_commission_percent: sellerId ? sellerCommission : null } as any);
      if (sellerId) {
        await syncSellerExpense(editingSaleId, formData, sellerId, sellerCommission);
      } else {
        // Remove seller expense if seller was cleared
        if (user) {
          await supabase.from("expense_entries").delete().eq("sale_id", editingSaleId).eq("category", "comissao").eq("user_id", user.id);
          queryClient.invalidateQueries({ queryKey: ["expense_entries"] });
        }
      }
    } else {
      const result = await createSale({ ...formData, seller_id: sellerId || undefined, seller_commission_percent: sellerId ? sellerCommission : undefined } as any);
      if (result && sellerId) {
        await syncSellerExpense(result.id, formData, sellerId, sellerCommission);
      }
    }
    setIsDialogOpen(false);
    setEditingSaleId(null);
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
      operator_id: (product as any).operator_id || null,
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

  const { showExport, setShowExport, agencyName } = useFinancialExport("Vendas");
  const handleExportSales = async (period: { start: Date; end: Date }, fmt: ExportFormat) => {
    const { columns, rows, totals } = prepareSalesExport(sales, period);
    await exportFinancialData({ tabLabel: "Vendas", columns, rows, period, agencyName, totals }, fmt);
  };

  return (
    <div className="space-y-4">
      {allSales.length > 0 && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Vendas</h3>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nova Venda
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Mais ações">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowExport(true)}>
                  <Download className="h-4 w-4 mr-2" /> Exportar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
      <ExportModal open={showExport} onOpenChange={setShowExport} tabName="Vendas" onExport={handleExportSales} />

      <NewSaleWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onCreated={(id) => setExpandedSales((prev) => new Set(prev).add(id))}
      />

      {allSales.length > 0 && availableOpportunities.length > 0 && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            <Download className="h-4 w-4 inline mr-1" />
            {availableOpportunities.length} oportunidade(s) fechada(s) disponível(is) para importar
          </p>
        </div>
      )}

      <div className="space-y-2">
        {sales.length === 0 ? (
          <div className="border border-dashed rounded-lg p-10 text-center space-y-3">
            <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {allSales.length === 0
                  ? "Você ainda não possui vendas cadastradas."
                  : "Nenhuma venda neste mês."}
              </p>
              <p className="text-xs text-muted-foreground">
                {allSales.length === 0
                  ? "Comece registrando uma venda para acompanhar comissões, recebimentos e notas fiscais."
                  : "Navegue para outro mês ou registre uma nova venda."}
              </p>
            </div>
            <Button onClick={() => setIsWizardOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Nova Venda
            </Button>
          </div>
        ) : (<>
          {/* Alert: sales without products */}
          {(() => {
            const salesWithoutProducts = sales.filter(s => getProductsForSale(s.id).length === 0);
            if (salesWithoutProducts.length === 0) return null;
            return (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
                <Package className="h-4 w-4 mt-0.5 shrink-0" />
                <span><strong>{salesWithoutProducts.length}</strong> venda{salesWithoutProducts.length > 1 ? "s" : ""} sem produtos cadastrados. Adicione produtos para calcular comissões e entradas automaticamente.</span>
              </div>
            );
          })()}
          {sales.map((sale) => {
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
                            {format(parseLocalDate(sale.sale_date), "dd/MM/yyyy", { locale: ptBR })}
                            {(sale as any).seller_id && (() => {
                              const seller = sellers.find(s => s.id === (sale as any).seller_id);
                              return seller ? <><span className="mx-2">•</span><Users className="h-3 w-3" />{seller.name}</> : null;
                            })()}
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
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{products.length} produto(s)</span>
                          <Button
                            variant={products.length === 0 ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={(e) => { e.stopPropagation(); openAddProduct(sale.id); }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Produto
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            title="Revisar e gerar contrato desta venda"
                            onClick={(e) => { e.stopPropagation(); setContractSale(sale); }}
                          >
                            <FileSignature className="h-3 w-3 mr-1" /> Contrato
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
          })}
        </>)}
      </div>

      {/* Sale Dialog (Create/Edit) — isolated component with local state */}
      {isDialogOpen && (
        <SaleFormDialog
          key={editingSaleId ?? "new"}
          open={isDialogOpen}
          onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingSaleId(null); }}
          sale={editingSaleId ? (sales.find((s) => s.id === editingSaleId) ?? null) : null}
          sellers={sellers}
          opportunities={availableOpportunities}
          isSaving={isSaving}
          onSubmit={handleSubmit}
        />
      )}

      {/* Product Dialog (Create/Edit) */}
      <Dialog open={isProductDialogOpen} onOpenChange={(open) => { setIsProductDialogOpen(open); if (!open) resetProductForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProductId ? "Editar Produto" : "Adicionar Produto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Section 1: Basic */}
            {renderSectionHeader(1, "Dados do Produto", "Tipo e descrição")}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <SupplierSelector
                  value={{
                    operator_id: productFormData.operator_id ?? null,
                    supplier_name: productFormData.supplier_name || "",
                  }}
                  onChange={(v) => {
                    setProductFormData((prev) => {
                      const next: SaleProductFormData = {
                        ...prev,
                        supplier_name: v.supplier_name,
                        operator_id: v.operator_id,
                      };
                      // Auto-fill from agency_supplier_terms only when creating a new product
                      // and the supplier actually changed to a structured one.
                      const changedOperator = v.operator_id && v.operator_id !== prev.operator_id;
                      if (!editingProductId && changedOperator) {
                        const t = termsData?.byOperator.get(v.operator_id!);
                        if (t) {
                          if (t.default_commission_type) {
                            next.commission_type = t.default_commission_type as 'percentage' | 'fixed';
                            if (t.default_commission_type === 'percentage' && t.default_commission_percent != null) {
                              next.commission_value = Number(t.default_commission_percent);
                            } else if (t.default_commission_type === 'fixed' && t.default_commission_fixed != null) {
                              next.commission_value = Number(t.default_commission_fixed);
                            }
                          }
                          if (t.default_non_commissionable_fees != null) {
                            next.non_commissionable_taxes = Number(t.default_non_commissionable_fees);
                          }
                          if (t.payment_rule && t.payment_rule !== 'manual') {
                            next.payment_rule = t.payment_rule as any;
                          }
                          if (t.payment_days != null) {
                            next.payment_days = Number(t.payment_days);
                          }
                          next.requires_invoice = !!t.requires_invoice;
                        }
                      }
                      return next;
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço de Venda *</Label>
                <Input type="number" value={productFormData.sale_price} onChange={(e) => setProductFormData({ ...productFormData, sale_price: Number(e.target.value) })} placeholder="0,00" />
              </div>
            </div>

            {/* Section 2: Commission */}
            {renderSectionHeader(2, "Comissão", "Quanto você recebe")}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
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
              <div className="space-y-2">
                <Label>Taxas não comissionáveis</Label>
                <Input type="number" value={productFormData.non_commissionable_taxes || ""} onChange={(e) => setProductFormData({ ...productFormData, non_commissionable_taxes: Number(e.target.value) })} placeholder="0,00" />
              </div>
            </div>

            {/* Commission summary */}
            <div className="grid gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Preço de venda</p>
                <p className="text-sm font-semibold">{formatCurrency(Number(productFormData.sale_price) || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Base comissionável</p>
                <p className="text-sm font-semibold">{formatCurrency(commissionBase)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comissão estimada</p>
                <p className="text-sm font-semibold text-primary">{formatCurrency(estimatedCommission)}</p>
              </div>
            </div>

            {/* Section 3: Advanced (collapsible) */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 w-full justify-start">
                  <ChevronRight className="h-3 w-3 transition-transform [[data-state=open]_&]:rotate-90" />
                  Recebimento e Nota Fiscal (avançado)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <div className="space-y-2">
                    <Label>Prazo em dias</Label>
                    <Input type="number" value={productFormData.payment_days} onChange={(e) => setProductFormData({ ...productFormData, payment_days: Number(e.target.value) })} placeholder="30" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data prevista de recebimento</Label>
                  <Input type="date" value={productFormData.expected_date || ""} onChange={(e) => setProductFormData({ ...productFormData, expected_date: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Calculada automaticamente ou informe manualmente</p>
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
                  <div className="space-y-4 rounded-lg border border-dashed border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
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
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter className="pt-2 border-t">
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

      <SaleContractDialog
        sale={contractSale}
        open={!!contractSale}
        onOpenChange={(o) => !o && setContractSale(null)}
      />
    </div>
  );
}
