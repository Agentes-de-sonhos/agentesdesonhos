export interface Sale {
  id: string;
  user_id: string;
  opportunity_id: string | null;
  client_name: string;
  destination: string;
  sale_amount: number;
  sale_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  products?: SaleProduct[];
}

export interface SaleProduct {
  id: string;
  sale_id: string;
  user_id: string;
  product_type: ProductType;
  description: string | null;
  sale_price: number;
  cost_price: number;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  created_at: string;
  updated_at: string;
}

export type ProductType = 
  | 'aereo' 
  | 'hotel' 
  | 'seguro' 
  | 'cruzeiro' 
  | 'transfer' 
  | 'atracao' 
  | 'locacao' 
  | 'outro';

export const PRODUCT_TYPES: Record<ProductType, string> = {
  aereo: 'Aéreo',
  hotel: 'Hotel',
  seguro: 'Seguro Viagem',
  cruzeiro: 'Cruzeiro',
  transfer: 'Transfer',
  atracao: 'Atrações/Ingressos',
  locacao: 'Locação de Veículo',
  outro: 'Outro',
};

export interface CustomerPayment {
  id: string;
  user_id: string;
  sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sale?: Sale;
}

export interface SupplierPayment {
  id: string;
  user_id: string;
  sale_id: string | null;
  sale_product_id: string | null;
  supplier_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeEntry {
  id: string;
  user_id: string;
  sale_id: string | null;
  amount: number;
  entry_date: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  sale?: Sale;
}

export interface ExpenseEntry {
  id: string;
  user_id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  entry_date: string;
  notes: string | null;
  expense_type: string;
  is_recurring: boolean;
  recurrence_end_type?: 'indefinite' | 'until_date' | 'occurrences';
  recurrence_end_date?: string | null;
  recurrence_occurrences?: number | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory =
  | 'sistema'
  | 'marketing'
  | 'internet'
  | 'aluguel'
  | 'salarios'
  | 'comissao'
  | 'administrativo'
  | 'financeiro'
  | 'comercial'
  | 'relacionamento'
  | 'operacional'
  | 'capacitacao'
  | 'transporte'
  | 'taxas'
  | 'outros'
  // Chaves legadas mantidas para compatibilidade com lançamentos antigos
  | 'fornecedor'
  | 'cafe_reuniao'
  | 'presente_fornecedor';

// Categorias ativas (ordem usada nos selects e relatórios).
export const EXPENSE_CATEGORIES: Record<string, string> = {
  sistema: 'Sistema / Software',
  marketing: 'Marketing',
  internet: 'Internet / Telefone',
  aluguel: 'Aluguel',
  salarios: 'Salários',
  comissao: 'Comissões',
  administrativo: 'Administrativo',
  financeiro: 'Financeiro',
  comercial: 'Despesas Comerciais',
  relacionamento: 'Relacionamento',
  operacional: 'Operacional',
  capacitacao: 'Capacitação',
  transporte: 'Transporte',
  taxas: 'Taxas / Impostos',
  outros: 'Outros',
};

// Labels completos (inclui chaves legadas) para exibição de lançamentos existentes.
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  ...EXPENSE_CATEGORIES,
  fornecedor: 'Operacional',
  cafe_reuniao: 'Despesas Comerciais',
  presente_fornecedor: 'Relacionamento',
};

export const PAYMENT_METHODS: Record<string, string> = {
  pix: 'PIX',
  credito: 'Cartão de Crédito',
  debito: 'Cartão de Débito',
  transferencia: 'Transferência Bancária',
  dinheiro: 'Dinheiro',
  boleto: 'Boleto',
};

export interface FinancialSummary {
  salesToday: number;
  salesMonth: number;
  salesYear: number;
  totalSales: number;
  totalCosts: number;
  grossProfit: number;
  totalCommissions: number;
  netProfit: number;
  totalCustomerPayments: number;
  totalSupplierPayments: number;
  cashBalance: number;
}

export interface SaleFormData {
  client_name: string;
  destination: string;
  sale_amount: number;
  sale_date: string;
  notes?: string;
  opportunity_id?: string;
}

export interface SaleProductFormData {
  product_type: ProductType;
  description?: string;
  sale_price: number;
  cost_price: number;
  non_commissionable_taxes: number;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  supplier_name?: string;
  payment_rule: string;
  payment_days: number;
  expected_date?: string;
  requires_invoice: boolean;
  invoice_status?: string;
  invoice_number?: string;
  invoice_issued_date?: string;
  invoice_sent_date?: string;
}

export interface CustomerPaymentFormData {
  sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
}

export interface SupplierPaymentFormData {
  sale_id?: string;
  sale_product_id?: string;
  supplier_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
}

export interface IncomeFormData {
  sale_id: string | null;
  amount: number;
  entry_date: string;
  payment_method: string;
  notes?: string;
}

export interface ExpenseFormData {
  description: string;
  category: ExpenseCategory;
  amount: number;
  entry_date: string;
  notes?: string;
  expense_type?: string;
  is_recurring?: boolean;
  recurrence_end_type?: 'indefinite' | 'until_date' | 'occurrences';
  recurrence_end_date?: string | null;
  recurrence_occurrences?: number | null;
}
