import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf-8");

const FIN = read("src/pages/Financeiro.tsx");

describe("Gestão Financeira — menu e roteamento", () => {
  it("exibe as abas na ordem exata aprovada", () => {
    const order = [
      "vendas", "entradas", "comissoes", "despesas", "vendedores",
      "recibos", "faturas", "notas-fiscais", "contratos", "fornecedores",
    ];
    const idx = order.map(k => FIN.indexOf(`key: "${k}"`));
    expect(idx.every(i => i > -1)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it("remove o dropdown 'Mais' e mantém rolagem horizontal", () => {
    expect(FIN).not.toContain("MoreHorizontal");
    expect(FIN).not.toContain("DropdownMenu");
    expect(FIN).toContain("overflow-x-auto");
  });

  it("Visão Geral fica fora da linha de abas, ao lado do seletor de mês", () => {
    expect(FIN).not.toContain('key: "dashboard"');
    const overview = FIN.indexOf("Visão Geral");
    const tablist = FIN.indexOf('role="tablist"');
    expect(overview).toBeGreaterThan(-1);
    expect(overview).toBeLessThan(tablist);
  });

  it("cada aba é uma view via tab/URL preservando o período global", () => {
    expect(FIN).toContain('setSearchParams({ tab: value }');
    expect(FIN).toContain("<ReceiptsCenter viewMonth={viewMonth} viewYear={viewYear} />");
    expect(FIN).toContain("<FiscalNotesTab />");
    expect(FIN).toContain("<ContractsCenter />");
  });
});

describe("Comissões", () => {
  const CC = read("src/components/financial/commissions/CommissionsCenter.tsx");
  it("abre direto o conteúdo de comissões, sem submenu", () => {
    expect(CC).toContain("CommissionsReceivable");
    expect(CC).not.toContain("FutureCashflow");
    expect(CC).not.toContain("SuppliersRanking");
    expect(CC).not.toContain("SUBTABS");
  });

  it("Notas Fiscais reutiliza o InvoicesCenter existente", () => {
    const FN = read("src/components/financial/commissions/FiscalNotesTab.tsx");
    expect(FN).toContain('from "./InvoicesCenter"');
  });
});

describe("Fornecedores — cadastro privado isolado", () => {
  const SM = read("src/components/financial/SuppliersManager.tsx");
  const SD = read("src/components/financial/SupplierCreateDialog.tsx");
  it("busca junto ao título e botão de cadastro ao lado", () => {
    expect(SM).toContain("Buscar fornecedor");
    expect(SM).toContain("Cadastrar novo fornecedor");
  });
  it("empty state atualizado e sem referência ao Mapa do Turismo", () => {
    expect(SM).toContain("ou cadastre seus próprios fornecedores.");
    expect(SM).not.toContain("no Mapa do Turismo");
  });
  it("grava fornecedor próprio da agência, nunca público", () => {
    expect(SD).toContain("owner_agency_id: agencyOwnerId");
    expect(SD).toContain("is_published: false");
    expect(SD).toContain("is_public_visible: false");
    expect(SD).toContain("useAgencyOwnerId");
    expect(SD).toContain('from("tour_operators")');
  });
});

describe("Vendedores", () => {
  const SEL = read("src/components/financial/SellersManager.tsx");
  const REP = read("src/components/financial/SellersCommissionReport.tsx");
  it("+ Novo ao lado do título", () => {
    const t = SEL.indexOf("Vendedores</h3>");
    const b = SEL.indexOf("Novo");
    expect(b).toBeGreaterThan(t);
  });
  it("remove apenas os quatro cards de resumo e mantém filtros/exportação", () => {
    expect(REP).not.toContain("Total de Comissões");
    expect(REP).not.toContain("Vendas com Comissão");
    expect(REP).not.toContain("Comissão Média");
    expect(REP).toContain("ExportButton");
    expect(REP).toContain("Vendedor");
  });
});

describe("Faturas e Recibos", () => {
  const INV = read("src/components/financial/invoices/InvoicesManager.tsx");
  const REC = read("src/components/financial/receipts/ReceiptsCenter.tsx");
  it("Faturas sem KPIs, título com + Nova fatura e sem submenu Recibos", () => {
    expect(INV).not.toContain("A Receber");
    expect(INV).not.toContain("Total Emitido");
    expect(INV).toContain("Nova fatura");
    expect(INV).not.toContain('value="recibos"');
    expect(INV).toContain('value="cobrancas"');
  });
  it("recibo somente após pagamento de fatura com saldo", () => {
    expect(REC).toContain("invoice_payments");
    expect(REC).toContain("RegisterPaymentDialog");
    expect(REC).toContain("generateReceiptPdf");
    expect(REC).toMatch(/balance\s*>\s*0/);
  });
});

describe("Contratos vinculados à venda", () => {
  const CT = read("src/components/financial/contracts/ContractsCenter.tsx");
  it("reutiliza SaleContractDialog e exige venda", () => {
    expect(CT).toContain("SaleContractDialog");
    expect(CT).toContain("sale_contracts");
    expect(CT).toContain("useAgencyContractTemplate");
  });
  it("bloqueio de modelo ausente reutilizado", () => {
    const SCD = read("src/components/financial/contracts/SaleContractDialog.tsx");
    const NOTICE = read("src/components/financial/contracts/ContractTemplateMissingNotice.tsx");
    expect(SCD).toContain("ContractTemplateMissingNotice");
    expect(CT).toContain("ContractTemplateMissingNotice");
    expect(NOTICE).toContain("Modelo de contrato ainda não configurado");
    expect(NOTICE).toContain("Solicitar cadastro do meu contrato");
    expect(NOTICE).toContain("useSupportWhatsApp");
  });
});
