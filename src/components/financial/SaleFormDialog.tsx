import { useEffect, useRef, useState } from "react";
import { Download, Loader2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Sale, SaleFormData } from "@/types/financial";

export interface SaleOpportunityOption {
  id: string;
  destination: string;
  estimated_value: number | string;
  notes?: string | null;
  client?: { name?: string | null } | null;
}

export interface SaleSellerOption {
  id: string;
  name: string;
  default_commission_percent: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sale being edited, or null when creating a new one. */
  sale: Sale | null;
  sellers: SaleSellerOption[];
  opportunities: SaleOpportunityOption[];
  isSaving: boolean;
  onSubmit: (data: SaleFormData, sellerId: string, sellerCommission: number) => void | Promise<void>;
}

const todayISO = () => new Date().toISOString().split("T")[0];

/**
 * Isolated sale form. All form state lives here and the component is mounted
 * only while the dialog is open, so background refetches / re-renders of the
 * SalesManager list can never reset the inputs or re-trigger the dialog's
 * focus scope while the user is typing.
 */
export function SaleFormDialog({
  open, onOpenChange, sale, sellers, opportunities, isSaving, onSubmit,
}: Props) {
  const isEditing = !!sale;
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<SaleFormData>(() =>
    sale
      ? {
          client_name: sale.client_name,
          destination: sale.destination,
          sale_amount: Number(sale.sale_amount),
          sale_date: sale.sale_date,
          notes: sale.notes || "",
          opportunity_id: sale.opportunity_id || undefined,
        }
      : { client_name: "", destination: "", sale_amount: 0, sale_date: todayISO(), notes: "" }
  );
  const [sellerId, setSellerId] = useState<string>(() => (sale as any)?.seller_id || "");
  const [sellerCommission, setSellerCommission] = useState<number>(
    () => Number((sale as any)?.seller_commission_percent) || 0
  );
  const [origin, setOrigin] = useState<"client" | "opportunity">("client");

  // Keep the "unsaved changes" guard of the platform update modal aware of
  // this form without touching any input state.
  const dirtyRef = useRef(false);
  dirtyRef.current = open;
  useEffect(() => {
    if (!open) return;
    const check = () => dirtyRef.current;
    window.__appUpdateDirtyChecks = window.__appUpdateDirtyChecks || [];
    window.__appUpdateDirtyChecks.push(check);
    return () => {
      window.__appUpdateDirtyChecks =
        (window.__appUpdateDirtyChecks || []).filter((c) => c !== check);
    };
  }, [open]);

  const handleOpportunitySelect = (opportunityId: string) => {
    const opp = opportunities.find((o) => o.id === opportunityId);
    if (!opp) return;
    setFormData({
      client_name: opp.client?.name || "",
      destination: opp.destination,
      sale_amount: Number(opp.estimated_value),
      sale_date: todayISO(),
      notes: opp.notes || "",
      opportunity_id: opp.id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        // Single, deterministic focus target: avoids autofocus contention
        // between the dialog, the inputs and the Radix Select triggers.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(() => firstFieldRef.current?.focus());
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Venda" : "Nova Venda"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados desta venda."
              : "Registre uma nova venda para acompanhar comissões e recebimentos."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEditing && (
            <div className="space-y-3">
              <Label>Origem da Venda</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrigin("client");
                    setFormData((prev) => ({ ...prev, opportunity_id: undefined }));
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${origin !== "opportunity" ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-muted-foreground/30"}`}
                >
                  <User className="h-4 w-4" /> Selecionar Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setOrigin("opportunity")}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${origin === "opportunity" ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-muted-foreground/30"}`}
                >
                  <Download className="h-4 w-4" /> Importar de Oportunidade
                </button>
              </div>

              {origin === "opportunity" && (
                <div className="space-y-2">
                  <Label>Oportunidade</Label>
                  {opportunities.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
                      Nenhuma oportunidade fechada disponível para importar.
                    </p>
                  ) : (
                    <Select
                      value={formData.opportunity_id || ""}
                      onValueChange={handleOpportunitySelect}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione uma oportunidade" /></SelectTrigger>
                      <SelectContent>
                        {opportunities.map((opp) => (
                          <SelectItem key={opp.id} value={opp.id}>
                            {opp.client?.name} - {opp.destination}
                          </SelectItem>
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
              <Label htmlFor="sale-client-name">Cliente *</Label>
              <Input
                id="sale-client-name"
                ref={firstFieldRef}
                value={formData.client_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, client_name: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-destination">Destino</Label>
              <Input
                id="sale-destination"
                value={formData.destination}
                onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
                placeholder="Destino da viagem"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sale-amount">Valor Total da Venda</Label>
              <Input
                id="sale-amount"
                type="number"
                value={formData.sale_amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, sale_amount: Number(e.target.value) }))}
                placeholder="0,00"
                disabled={isEditing}
              />
              {isEditing && (
                <p className="text-[11px] text-muted-foreground">
                  Calculado automaticamente pela soma dos produtos vendidos.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-date">Data da Venda</Label>
              <Input
                id="sale-date"
                type="date"
                value={formData.sale_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, sale_date: e.target.value }))}
              />
            </div>
          </div>

          {sellers.length > 0 && (
            <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" /> Quem vendeu?
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vendedora</Label>
                  <Select
                    value={sellerId}
                    onValueChange={(v) => {
                      setSellerId(v);
                      const sel = sellers.find((s) => s.id === v);
                      if (sel) setSellerCommission(sel.default_commission_percent);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.default_commission_percent}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {sellerId && (
                  <div className="space-y-2">
                    <Label htmlFor="sale-seller-commission">Comissão (%)</Label>
                    <Input
                      id="sale-seller-commission"
                      type="number"
                      value={sellerCommission}
                      onChange={(e) => setSellerCommission(Number(e.target.value))}
                      min={0}
                      max={100}
                      step={0.5}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.sale_amount > 0 &&
                        `= ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          formData.sale_amount * sellerCommission / 100
                        )}`}
                    </p>
                  </div>
                )}
              </div>
              {sellerId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => { setSellerId(""); setSellerCommission(0); }}
                >
                  Remover vendedora
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sale-notes">Observações</Label>
            <Textarea
              id="sale-notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações opcionais"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => onSubmit(formData, sellerId, sellerCommission)}
            disabled={isSaving || !formData.client_name || !formData.destination}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
