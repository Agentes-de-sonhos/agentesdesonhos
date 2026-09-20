import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const MESSAGE_SEARCH_LIMIT = 12;

export interface MessageSearchResult {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  otherUser: { user_id: string; name: string; avatar_url: string | null };
}

/**
 * Busca no texto das mensagens diretas do chat interno. Só considera conversas
 * das quais o usuário autenticado participa (as próprias conversas são
 * carregadas antes e usadas como filtro, além do RLS do banco), então nunca
 * expõe mensagens de terceiros nem dados privados de contato.
 */
export function useCommunityMessageSearch(term: string, enabled: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["community-search-messages", user?.id, term],
    enabled: enabled && !!user?.id && term.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<MessageSearchResult[]> => {
      if (!user?.id) return [];

      const { data: conversations, error: convError } = await supabase
        .from("direct_conversations")
        .select("id, user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      if (convError) throw convError;
      if (!conversations || conversations.length === 0) return [];

      const otherByConversation = new Map<string, string>();
      for (const conversation of conversations) {
        otherByConversation.set(
          conversation.id,
          conversation.user_a === user.id ? conversation.user_b : conversation.user_a,
        );
      }

      const { data: messages, error: msgError } = await supabase
        .from("direct_messages")
        .select("id, conversation_id, content, created_at")
        .in("conversation_id", Array.from(otherByConversation.keys()))
        .ilike("content", `%${term}%`)
        .order("created_at", { ascending: false })
        .limit(MESSAGE_SEARCH_LIMIT);
      if (msgError) throw msgError;
      if (!messages || messages.length === 0) return [];

      const otherIds = Array.from(
        new Set(
          messages
            .map((m) => otherByConversation.get(m.conversation_id))
            .filter((id): id is string => !!id),
        ),
      );

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", otherIds);
      const profileById = new Map((profiles || []).map((p) => [p.user_id, p]));

      return messages.map((message) => {
        const otherId = otherByConversation.get(message.conversation_id) || "";
        const profile = profileById.get(otherId);
        return {
          id: message.id,
          conversationId: message.conversation_id,
          content: message.content,
          createdAt: message.created_at,
          otherUser: {
            user_id: otherId,
            name: profile?.name || "Membro",
            avatar_url: profile?.avatar_url ?? null,
          },
        };
      });
    },
  });
}
