// Catálogo central de permissões disponíveis para subusuários da equipe.

export type ModuleKey = 'clients' | 'financial'
export type PipelineType = 'opportunities' | 'operations'

export interface PermissionDef {
  key: string
  label: string
  module: ModuleKey
}

export const CLIENTS_PERMISSIONS: PermissionDef[] = [
  { key: 'dashboard.view', label: 'Dashboard - Visualizar', module: 'clients' },
  { key: 'clients.view', label: 'Clientes - Visualizar', module: 'clients' },
  { key: 'clients.create', label: 'Clientes - Criar', module: 'clients' },
  { key: 'clients.edit', label: 'Clientes - Editar', module: 'clients' },
  { key: 'clients.delete', label: 'Clientes - Excluir', module: 'clients' },
  { key: 'opportunities.view', label: 'Oportunidades - Visualizar', module: 'clients' },
  { key: 'opportunities.create', label: 'Oportunidades - Criar', module: 'clients' },
  { key: 'opportunities.edit', label: 'Oportunidades - Editar', module: 'clients' },
  { key: 'opportunities.delete', label: 'Oportunidades - Excluir', module: 'clients' },
  { key: 'opportunities.generate_quote', label: 'Oportunidades - Gerar orçamento', module: 'clients' },
  { key: 'opportunities.generate_wallet', label: 'Oportunidades - Gerar carteira digital', module: 'clients' },
  { key: 'operations.view', label: 'Operações - Visualizar', module: 'clients' },
  { key: 'operations.create', label: 'Operações - Criar', module: 'clients' },
  { key: 'operations.edit', label: 'Operações - Editar', module: 'clients' },
  { key: 'operations.delete', label: 'Operações - Excluir', module: 'clients' },
  { key: 'goals.view', label: 'Metas - Visualizar', module: 'clients' },
  { key: 'goals.edit', label: 'Metas - Editar', module: 'clients' },
]

export const FINANCIAL_PERMISSIONS: PermissionDef[] = [
  { key: 'financial.access', label: 'Gestão Financeira - Acesso total', module: 'financial' },
]

export const ALL_PERMISSIONS: PermissionDef[] = [
  ...CLIENTS_PERMISSIONS,
  ...FINANCIAL_PERMISSIONS,
]

export function totalClientsAccess(): { module_key: ModuleKey; permission_key: string; enabled: true }[] {
  return CLIENTS_PERMISSIONS.map(p => ({ module_key: 'clients', permission_key: p.key, enabled: true }))
}

export function totalFinancialAccess(): { module_key: ModuleKey; permission_key: string; enabled: true }[] {
  return FINANCIAL_PERMISSIONS.map(p => ({ module_key: 'financial', permission_key: p.key, enabled: true }))
}