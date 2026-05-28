export type OperationStage =
  | 'venda_confirmada'
  | 'emissao'
  | 'documentacao'
  | 'entrega'
  | 'pre_embarque'
  | 'em_viagem'
  | 'pos_viagem'
  | 'finalizado';

export type OperationPriority = 'normal' | 'alta' | 'urgente';
export type OperationPaymentStatus = 'pendente' | 'parcial' | 'pago';

export interface Operation {
  id: string;
  user_id: string;
  client_id: string;
  opportunity_id: string | null;
  quote_id: string | null;
  itinerary_id: string | null;
  trip_id: string | null;
  title: string;
  destination: string | null;
  travel_start_date: string | null;
  travel_end_date: string | null;
  passengers_count: number;
  sale_amount: number;
  stage: OperationStage;
  priority: OperationPriority;
  payment_status: OperationPaymentStatus;
  assigned_user_id: string | null;
  notes: string | null;
  position: number;
  notification_preferences: Record<string, unknown>;
  stage_entered_at: string;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string; phone: string | null; email: string | null };
}

export interface OperationTask {
  id: string;
  operation_id: string;
  user_id: string;
  stage: OperationStage;
  label: string;
  is_done: boolean;
  done_at: string | null;
  done_by: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface OperationTimelineEvent {
  id: string;
  operation_id: string;
  user_id: string;
  event_type: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OperationAttachment {
  id: string;
  operation_id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  created_at: string;
}

export const OPERATION_STAGES: { key: OperationStage; label: string; color: string; bg: string; border: string; text: string }[] = [
  { key: 'venda_confirmada', label: 'Pagamento Confirmado', color: 'bg-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'emissao',          label: 'Emissão / Reservas', color: 'bg-blue-600',  bg: 'bg-blue-50 dark:bg-blue-950/40',   border: 'border-blue-200 dark:border-blue-800',   text: 'text-blue-700 dark:text-blue-300' },
  { key: 'documentacao',     label: 'Documentação',       color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300' },
  { key: 'entrega',          label: 'Entrega da Viagem',  color: 'bg-violet-600',bg: 'bg-violet-50 dark:bg-violet-950/40',border: 'border-violet-200 dark:border-violet-800',text: 'text-violet-700 dark:text-violet-300' },
  { key: 'pre_embarque',     label: 'Pré-Embarque',       color: 'bg-orange-600',bg: 'bg-orange-50 dark:bg-orange-950/40',border: 'border-orange-200 dark:border-orange-800',text: 'text-orange-700 dark:text-orange-300' },
  { key: 'em_viagem',        label: 'Em Viagem',          color: 'bg-sky-600',   bg: 'bg-sky-50 dark:bg-sky-950/40',     border: 'border-sky-200 dark:border-sky-800',     text: 'text-sky-700 dark:text-sky-300' },
  { key: 'pos_viagem',       label: 'Pós-Viagem',         color: 'bg-fuchsia-600',bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',border: 'border-fuchsia-200 dark:border-fuchsia-800',text: 'text-fuchsia-700 dark:text-fuchsia-300' },
  { key: 'finalizado',       label: 'Finalizado',         color: 'bg-slate-500', bg: 'bg-slate-100 dark:bg-slate-900/40',border: 'border-slate-200 dark:border-slate-700', text: 'text-slate-600 dark:text-slate-400' },
];

export const STAGE_CHECKLISTS: Record<OperationStage, string[]> = {
  venda_confirmada: [
    'Pagamento confirmado',
    'Passageiros conferidos',
    'Nomes corretos',
    'Datas conferidas',
    'Contatos validados',
  ],
  emissao: [
    'Aéreo emitido',
    'Hotel confirmado',
    'Seguro emitido',
    'Ingressos emitidos',
    'Vouchers recebidos',
  ],
  documentacao: [
    'Passaporte',
    'Vistos',
    'Vacinas',
    'Autorização de menores',
    'Formulários internacionais',
  ],
  entrega: [
    'Roteiro aprovado',
    'Carteira digital enviada',
    'Vouchers conferidos',
    'Documentação enviada',
    'Orientações finais enviadas',
  ],
  pre_embarque: [
    'Check-in realizado',
    'Bagagem orientada',
    'Documentos confirmados',
    'Suporte alinhado',
    'Contatos enviados',
  ],
  em_viagem: [
    'Cliente embarcou',
    'Suporte disponível',
    'Contatos emergenciais compartilhados',
  ],
  pos_viagem: [
    'Solicitar feedback',
    'Solicitar avaliação',
    'Pedir fotos',
    'Pedir depoimento',
    'Solicitar indicação',
    'Criar nova oportunidade',
  ],
  finalizado: [],
};

export function getStageMeta(stage: OperationStage) {
  return OPERATION_STAGES.find((s) => s.key === stage) || OPERATION_STAGES[0];
}