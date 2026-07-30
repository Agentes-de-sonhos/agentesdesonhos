export type ContractTemplateStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface ContractHeaderConfig {
  trade_name?: string;
  legal_name?: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  cadastur?: string;
  legal_representative?: string;
  representative_role?: string;
  emission_city?: string;
}

export interface ContractFooterConfig {
  note?: string;
  show_pagination?: boolean;
  show_emission_datetime?: boolean;
}

export interface ContractSignatureConfig {
  show_passenger_signatures?: boolean;
  show_witnesses?: boolean;
  representative_name?: string;
  representative_role?: string;
}

export interface AgencyContractTemplate {
  id: string;
  agency_id: string;
  name: string;
  description: string | null;
  version: number;
  status: ContractTemplateStatus;
  legal_body_html: string;
  header_config: ContractHeaderConfig;
  footer_config: ContractFooterConfig;
  signature_config: ContractSignatureConfig;
  logo_url: string | null;
  agency_data_snapshot: Record<string, unknown>;
  contract_title: string;
  effective_from: string | null;
  effective_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractTemplateSection {
  id: string;
  template_id: string;
  section_key: string;
  title: string | null;
  body_html: string;
  display_order: number;
  is_fixed: boolean;
}

export type SaleContractStatus =
  | 'draft' | 'generated' | 'sent' | 'signed' | 'cancelled' | 'superseded';

export interface SaleContract {
  id: string;
  agency_id: string;
  sale_id: string;
  template_id: string | null;
  template_version: number | null;
  contract_number: string;
  revision: number;
  status: SaleContractStatus;
  generated_payload_json: ContractPayload;
  generated_html: string | null;
  pdf_url: string | null;
  generated_at: string;
  generated_by: string | null;
  client_snapshot_json: Record<string, unknown>;
  passengers_snapshot_json: ContractPassenger[];
  services_snapshot_json: ContractService[];
  financial_snapshot_json: Record<string, unknown>;
  agency_snapshot_json: Record<string, unknown>;
  attachments_json: ContractAttachment[];
  source_hash: string | null;
  document_hash: string | null;
  /** Hash SHA-256 dos bytes exatos do PDF entregue. */
  pdf_sha256: string | null;
  pdf_size_bytes: number | null;
  pdf_generated_at: string | null;
  pdf_generator_version: string | null;
  pdf_storage_path: string | null;
  pdf_mime_type: string | null;
  pdf_file_name: string | null;
  supersedes_contract_id: string | null;
  created_at: string;
}

export interface ContractAttachment {
  label: string;
  note?: string;
}

export interface ContractPassenger {
  name: string;
  cpf?: string;
  birth_date?: string;
  age_at_trip?: number | null;
  category?: 'adulto' | 'crianca' | 'bebe';
  nationality?: string;
  passport?: string;
  passport_validity?: string;
  is_minor?: boolean;
  guardian?: string;
  notes?: string;
}

/** Linha de assinatura adicional, criada apenas com papel explícito confirmado pela agência. */
export interface ContractSigner {
  name: string;
  role: 'anuente' | 'signatario';
  document?: string;
}

export interface ContractInstallment {
  number: number;
  due_date: string;
  amount: number;
}

export interface ContractReceivedPayment {
  date: string;
  amount: number;
  method: string;
  kind: 'entrada' | 'adicional';
}

export interface ContractService {
  type: string;
  type_label: string;
  description?: string;
  supplier?: string;
  operator?: string;
  locator?: string;
  amount: number;
  taxes?: number;
  currency: string;
  notes?: string;
  refundable?: 'sim' | 'nao' | 'nao_informado';
}

export interface ContractAgencyBlock extends ContractHeaderConfig {
  logo_url?: string | null;
}

export interface ContractClientBlock {
  name: string;
  document?: string;
  person_type?: 'fisica' | 'juridica';
  birth_date?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_passenger?: boolean;
  financial_responsible?: string;
  relation_note?: string;
}

export interface ContractTripBlock {
  title?: string;
  scope?: 'nacional' | 'internacional' | '';
  origin?: string;
  destination?: string;
  other_places?: string;
  start_date?: string | null;
  end_date?: string | null;
  nights?: number | null;
  days?: number | null;
  passengers_count?: number;
  purpose?: string;
  program_note?: string;
}

export interface ContractFinancialBlock {
  gross: number;
  discounts: number;
  taxes: number;
  service_fee: number;
  total: number;
  currency: string;
  down_payment: number;
  balance: number;
  paid: number;
  pending: number;
  paid_to_supplier: number;
  payment_method?: string;
  installments_count?: number | null;
  installment_value?: number | null;
  due_dates?: string;
  notes?: string;
  payments: { date: string; amount: number; method: string }[];
  /** Pagamentos já recebidos pela CONTRATADA, classificados. */
  received: ContractReceivedPayment[];
  /** Cronograma das parcelas futuras (gerado a partir do 1º vencimento ou vazio). */
  schedule: ContractInstallment[];
  /** Descrição consolidada e automática da forma de pagamento. */
  payment_summary: string;
}

export interface ContractConditionsBlock {
  non_refundable_note?: string;
  penalties?: string;
  no_show?: string;
  baggage?: string;
  destination_fees?: string;
  resort_fee?: string;
  documentation?: string;
  minors?: string;
  charter?: string;
  road_minimum?: string;
  car_rental?: string;
  discounts?: string;
  general_notes?: string;
}

export interface ContractInsuranceBlock {
  contracted: boolean;
  insurer?: string;
  plan?: string;
  validity?: string;
  coverage?: string;
  covered_passengers?: string;
  refusal_acknowledged?: boolean;
  /** Rastro interno de importação assistida (auditoria; não aparece no PDF). */
  provenance?: import('@/lib/insuranceSources').InsuranceFieldProvenance[];
}

export interface ContractPayload {
  contract_title: string;
  contract_number: string;
  revision: number;
  emission_city?: string;
  emitted_at: string;
  sale_reference: string;
  receipt_number?: string;
  external_reference?: string;
  seller_name?: string;
  agency: ContractAgencyBlock;
  client: ContractClientBlock;
  passengers: ContractPassenger[];
  signers: ContractSigner[];
  trip: ContractTripBlock;
  services: ContractService[];
  included: string[];
  not_included: string[];
  financial: ContractFinancialBlock;
  conditions: ContractConditionsBlock;
  insurance: ContractInsuranceBlock;
  attachments: ContractAttachment[];
  legal_body_html: string;
  sections: { title: string | null; body_html: string }[];
  signature_config: ContractSignatureConfig;
  footer_config: ContractFooterConfig;
}