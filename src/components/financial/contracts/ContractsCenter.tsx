import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Download, Eye, FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { useFinancial } from "@/hooks/useFinancial";
import { useAgencyContractTemplate } from "@/hooks/useSaleContracts";
import type { Sale } from "@/types/financial";
import type { SaleContract } from "@/types/contracts";
import { SaleContractDialog } from "./SaleContractDialog";
import { ContractTemplateMissingNotice } from "./ContractTemplateMissingNotice";
import {
  contractPdfFileName, downloadPdfBlob, generateSaleContractPdf,
} from "@/lib/generateSaleContractPdf";
import { downloadStoredContractPdf } from "@/lib/contractPdfStorage";

const STATUS_LABEL: Record<string, string> = {
  generated: "Gerado",
  superseded: "Substituído",
  cancelled: "Cancelado",
};

/**
 * Aba "Contratos": contratos de prestação de serviços turísticos entre a agência
 * e seus clientes, sempre vinculados a uma venda. Reutiliza integralmente
 * sale_contracts, o SaleContractDialog, os PDFs e a auditoria existentes.
 */
export function ContractsCenter() {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();
  const { sales } = useFinancial();
  const { data: templateData, isLoading: loadingTemplate } = useAgencyContractTemplate();
  const hasTemplate = !!templateData?.template;

  const [query, setQuery] = useState("");
  const [blockOpen, setBlockOpen] = useState(false);
  const [salePickerOpen, setSalePickerOpen] = useState(false);
  const [contractSale, setContractSale] = useState<Sale | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["contracts-agency-profile", user?.id],
    enabled: !!user?.id && blockOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, agency_name, cnpj")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { name?: string; agency_name?: string; cnpj?: string } | null;
    },
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["agency-sale-contracts", agencyOwnerId],
    enabled: !!agencyOwnerId,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_contracts")
        .select("*")
        .eq("agency_id", agencyOwnerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SaleContract[];
    },
  });

  const salesById = useMemo(() => {
    const m = new Map<string, Sale>();
    sales.forEach((s) => m.set(s.id, s));
    return m;
  }, [sales]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((c) => {
      const sale = c.sale_id ? salesById.get(c.sale_id) : undefined;
      const client = (c.client_snapshot_json as any)?.name || sale?.client_name || "";
      return (
        (c.contract_number || "").toLowerCase().includes(q) ||
        String(client).toLowerCase().includes(q) ||
        (sale?.destination || "").toLowerCase().includes(q)
      );
    });
  }, [contracts, query, salesById]);

  const handleNew = () => {
    if (!hasTemplate) { setBlockOpen(true); return; }
    if (sales.length === 0) {
      toast.error("Cadastre uma venda antes de gerar um contrato.");
      return;
    }
    setSalePickerOpen(true);
  };

  const handleDownload = async (c: SaleContract) => {
    try {
      if (c.pdf_storage_path) {
        const blob = await downloadStoredContractPdf(c.pdf_storage_path);
        downloadPdfBlob(blob, c.pdf_file_name ?? contractPdfFileName(c.generated_payload_json));
      } else {
        const blob = await generateSaleContractPdf(c.generated_payload_json);
        downloadPdfBlob(blob, contractPdfFileName(c.generated_payload_json));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível baixar o PDF.");
    }
  };

  const handleOpenSale = (c: SaleContract) => {
    const sale = c.sale_id ? salesById.get(c.sale_id) : undefined;
    if (!sale) { toast.error("Venda vinculada não encontrada."); return; }
    setContractSale(sale);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Contratos</h2>
        <Button onClick={handleNew} disabled={loadingTemplate}>
          <Plus className="h-4 w-4 mr-1" /> Novo contrato
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Contratos de prestação de serviços turísticos entre a agência e seus clientes, vinculados às vendas.
      </p>

      <Input
        placeholder="Buscar por número, cliente ou destino..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum contrato gerado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const sale = c.sale_id ? salesById.get(c.sale_id) : undefined;
            const client = (c.client_snapshot_json as any)?.name || sale?.client_name || "—";
            return (
              <Card key={c.id}>
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[12rem]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{c.contract_number}</span>
                      <Badge variant="outline" className="text-xs">Rev. {c.revision}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        {STATUS_LABEL[c.status] || c.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 truncate">
                      {client}
                      {sale?.destination ? ` • ${sale.destination}` : ""}
                      {c.created_at ? ` • ${new Date(c.created_at).toLocaleDateString("pt-BR")}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleOpenSale(c)} title="Visualizar">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(c)} title="Baixar PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sem modelo ativo: mesmo bloqueio do SaleContractDialog */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contrato da venda</DialogTitle>
          </DialogHeader>
          <ContractTemplateMissingNotice
            agencyName={profile?.agency_name}
            cnpj={profile?.cnpj}
            userName={profile?.name}
          />
        </DialogContent>
      </Dialog>

      {/* Seleção obrigatória de venda */}
      <Dialog open={salePickerOpen} onOpenChange={setSalePickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Selecione a venda</DialogTitle>
            <DialogDescription>
              Todo contrato é vinculado a uma venda e ao respectivo cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {sales.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSalePickerOpen(false); setContractSale(s); }}
                className="w-full text-left rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <div className="font-medium">{s.client_name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.destination} • {new Date(s.sale_date).toLocaleDateString("pt-BR")}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <SaleContractDialog
        sale={contractSale}
        open={!!contractSale}
        onOpenChange={(o) => !o && setContractSale(null)}
      />
    </div>
  );
}
