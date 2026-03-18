export type TicketStatus = 'aberto' | 'em_andamento' | 'resolvido';

export type TicketCategory = 'geral' | 'financeiro' | 'tecnico' | 'conta' | 'assinatura' | 'sugestao' | 'bug';

export const TICKET_CATEGORIES: Record<TicketCategory, string> = {
  geral: 'Geral',
  financeiro: 'Financeiro',
  tecnico: 'Técnico',
  conta: 'Minha Conta',
  assinatura: 'Assinatura',
  sugestao: 'Sugestão',
  bug: 'Reportar Bug',
};

export const TICKET_STATUSES: Record<TicketStatus, { label: string; color: string }> = {
  aberto: { label: 'Aberto', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  em_andamento: { label: 'Em andamento', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  resolvido: { label: 'Resolvido', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
};

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  tags: string[];
  last_message_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_name?: string;
  user_avatar?: string;
  unread_count?: number;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  content: string;
  is_admin: boolean;
  attachment_urls: string[];
  read_at: string | null;
  created_at: string;
  // Joined
  sender_name?: string;
  sender_avatar?: string;
}
