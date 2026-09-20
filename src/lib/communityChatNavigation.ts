/**
 * Ponte entre a busca da Comunidade e o chat interno já existente: um evento de
 * janela abre a conversa correta e destaca a mensagem encontrada, sem trocar de
 * rota e sem criar um segundo sistema de mensagens.
 */
export const OPEN_COMMUNITY_CONVERSATION_EVENT = "community-chat:open-conversation";

export interface OpenCommunityConversationDetail {
  conversationId: string;
  messageId?: string;
}

export function openCommunityConversation(detail: OpenCommunityConversationDetail): void {
  if (typeof window === "undefined" || !detail.conversationId) return;
  window.dispatchEvent(
    new CustomEvent<OpenCommunityConversationDetail>(OPEN_COMMUNITY_CONVERSATION_EVENT, { detail }),
  );
}
