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
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory = 'fornecedor' | 'comissao' | 'taxas' | 'marketing' | 'outros';

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  fornecedor: 'Fornecedor',
  comissao: 'Comissão',
  taxas: 'Taxas',
  marketing: 'Marketing',
  outros: 'Outros',
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
  totalIncome: number;
  totalExpenses: number;
  result: number;
}

export interface SaleFormData {
  client_name: string;
  destination: string;
  sale_amount: number;
  sale_date: string;
  notes?: string;
  opportunity_id?: string;
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
}
