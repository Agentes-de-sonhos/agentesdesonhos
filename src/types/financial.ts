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
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
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
}
