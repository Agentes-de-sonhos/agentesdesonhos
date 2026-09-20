import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  SEARCH_FILTERS,
  SEARCH_MIN_TERM,
  SEARCH_DEBOUNCE_MS,
  MESSAGES_COMPACT_LIMIT,
  isSearchTermValid,
  postSnippet,
} from "@/components/community/CommunitySearchOverlay";
import {
  OPEN_COMMUNITY_CONVERSATION_EVENT,
  openCommunityConversation,
} from "@/lib/communityChatNavigation";
import { isPostTextClamped } from "@/components/community/PostTextContent";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const overlay = read("src/components/community/CommunitySearchOverlay.tsx");
const messageHook = read("src/hooks/useCommunityMessageSearch.ts");
const lightbox = read("src/components/community/PostLightbox.tsx");
const panel = read("src/components/community/PostGallerySocialPanel.tsx");
const postCard = read("src/components/community/PostCard.tsx");
const dashboardFeed = read("src/components/dashboard/CommunitySocialFeed.tsx");
const chatButton = read("src/components/community-chat/ChatFloatingButton.tsx");
const chatList = read("src/components/community-chat/ChatMessageList.tsx");

describe("Fase 5 — busca de mensagens", () => {
  it("mantém Tudo, Pessoas e Publicações e adiciona Mensagens", () => {
    expect(SEARCH_FILTERS.map((f) => f.key)).toEqual(["all", "people", "posts", "messages"]);
    expect(SEARCH_FILTERS.find((f) => f.key === "messages")?.label).toBe("Mensagens");
  });

  it("preserva debounce e termo mínimo da busca", () => {
    expect(SEARCH_MIN_TERM).toBe(2);
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
    expect(isSearchTermValid("a")).toBe(false);
    expect(isSearchTermValid("ab")).toBe(true);
  });

  it("em Tudo mostra seção compacta de mensagens", () => {
    expect(MESSAGES_COMPACT_LIMIT).toBe(3);
    expect(overlay).toContain('filter === "all" ? allMessages.slice(0, MESSAGES_COMPACT_LIMIT)');
    expect(overlay).toContain('data-search-messages');
  });

  it("isola por participação: filtra pelas conversas do próprio usuário", () => {
    expect(messageHook).toContain('from("direct_conversations")');
    expect(messageHook).toContain("`user_a.eq.${user.id},user_b.eq.${user.id}`");
    expect(messageHook).toContain('.in("conversation_id", Array.from(otherByConversation.keys()))');
    expect(messageHook).toContain('from("direct_messages")');
    // Nunca seleciona dados privados de contato.
    expect(messageHook).not.toContain("phone");
    expect(messageHook).not.toContain("email");
  });

  it("reutiliza o chat existente e limita o histórico", () => {
    expect(messageHook).toContain("MESSAGE_SEARCH_LIMIT");
    expect(messageHook).toContain(".limit(MESSAGE_SEARCH_LIMIT)");
    expect(messageHook).not.toContain("insert(");
  });

  it("exibe interlocutor, trecho e data/hora", () => {
    expect(overlay).toContain("message.otherUser.name");
    expect(overlay).toContain("postSnippet(message.content, debounced)");
    expect(overlay).toContain('"dd/MM/yyyy HH:mm"');
    expect(postSnippet("Olá mundo da comunidade", "mundo")).toContain("mundo");
  });

  it("abre a conversa correta e destaca a mensagem", () => {
    expect(overlay).toContain("openCommunityConversation({");
    expect(overlay).toContain("conversationId: message.conversationId");
    expect(overlay).toContain("messageId: message.id");
    expect(chatButton).toContain("OPEN_COMMUNITY_CONVERSATION_EVENT");
    expect(chatButton).toContain("setHighlightMessageId(detail.messageId ?? null)");
    expect(chatButton).toContain("highlightMessageId={highlightMessageId}");
    expect(chatList).toContain("highlightMessageId");
    expect(chatList).toContain("data-chat-message-highlight");
  });

  it("dispara o evento com os dados da conversa", () => {
    const events: OpenCommunityConversationDetailLike[] = [];
    const handler = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    window.addEventListener(OPEN_COMMUNITY_CONVERSATION_EVENT, handler);
    openCommunityConversation({ conversationId: "conv-1", messageId: "msg-1" });
    openCommunityConversation({ conversationId: "", messageId: "msg-2" });
    window.removeEventListener(OPEN_COMMUNITY_CONVERSATION_EVENT, handler);
    expect(events).toEqual([{ conversationId: "conv-1", messageId: "msg-1" }]);
  });

  it("trata estados de carregamento, erro e vazio incluindo mensagens", () => {
    expect(overlay).toContain("(wantsMessages && messagesQuery.isLoading)");
    expect(overlay).toContain("(wantsMessages && messagesQuery.isError)");
    expect(overlay).toContain("messages.length === 0");
    expect(overlay).toContain("if (wantsMessages) messagesQuery.refetch();");
  });
});

interface OpenCommunityConversationDetailLike {
  conversationId: string;
  messageId?: string;
}

describe("Fase 5 — galeria social", () => {
  it("preserva o comportamento original da galeria", () => {
    expect(lightbox).toContain("bg-foreground/95");
    expect(lightbox).toContain("object-contain");
    expect(lightbox).toContain("SWIPE_THRESHOLD");
    expect(lightbox).toContain('event.key === "ArrowRight"');
    expect(lightbox).toContain('event.key === "ArrowLeft"');
    expect(lightbox).toContain("data-post-lightbox-indicator");
    expect(lightbox).toContain("data-post-lightbox-prev");
    expect(lightbox).toContain("data-post-lightbox-next");
    // Acima da barra inferior mobile.
    expect(lightbox).toContain("z-[120]");
  });

  it("mostra autor, agência e texto em duas linhas com mais/menos", () => {
    expect(panel).toContain("post.profile?.avatar_url");
    expect(panel).toContain("post.profile?.agency_name");
    expect(panel).toContain("clampLines={2}");
    const text = read("src/components/community/PostTextContent.tsx");
    expect(text).toContain('clampLines === 2 ? "line-clamp-2" : "line-clamp-3"');
    expect(text).toContain("data-post-text-more");
    expect(text).toContain("data-post-text-less");
    expect(isPostTextClamped("a".repeat(160), 2)).toBe(true);
    expect(isPostTextClamped("a".repeat(160), 3)).toBe(false);
  });

  it("reutiliza curtidas, comentários e envio sem duplicar lógica", () => {
    expect(panel).toContain("onLike(post.id, !!post.user_liked)");
    expect(panel).toContain("<PostCommentsSection");
    expect(panel).toContain("<SharePostDialog");
    expect(panel).toContain("data-post-gallery-like");
    expect(panel).toContain("data-post-gallery-comment");
    expect(panel).toContain("data-post-gallery-share");
    // Sem consultas próprias de curtida/comentário no painel.
    expect(panel).not.toContain("supabase");
  });

  it("mantém contadores sincronizados com o card", () => {
    expect(panel).toContain("post.likes_count");
    expect(panel).toContain("post.comments_count");
    expect(dashboardFeed).toContain("const lightboxPost = lightbox");
    expect(dashboardFeed).toContain("(posts as CommunityPost[]).find((p) => p.id === lightbox.postId)");
  });

  it("recebe o post completo nos dois feeds", () => {
    expect(postCard).toContain("social={{");
    expect(postCard).toContain("post,");
    expect(postCard).toContain("onToggleCommentLike,");
    expect(dashboardFeed).toContain("post: lightboxPost,");
    expect(dashboardFeed).toContain("onLike: (postId, liked) => toggleLike({ postId, liked })");
  });

  it("navega por todas as fotos, inclusive as escondidas pelo +N", () => {
    const grid = read("src/components/community/PostMediaGrid.tsx");
    expect(grid).toContain("onOpenImage");
    expect(postCard).toContain("<PostMediaGrid images={images}");
    expect(lightbox).toContain("images[index]");
    expect(lightbox).toContain("images.length - 1");
  });

  it("respeita safe-area e é responsivo no desktop", () => {
    expect(panel).toContain("env(safe-area-inset-bottom)");
    expect(panel).toContain("lg:w-[380px]");
    expect(lightbox).toContain("lg:flex-row");
  });

  it("não altera LabBase, white-labels nem fornecedores", () => {
    const touched = [
      "src/components/community/PostLightbox.tsx",
      "src/components/community/PostGallerySocialPanel.tsx",
      "src/components/community/CommunitySearchOverlay.tsx",
      "src/hooks/useCommunityMessageSearch.ts",
    ];
    for (const file of touched) {
      const content = read(file);
      expect(content).not.toContain("white-label");
      expect(content).not.toContain("agency_public_domains");
      expect(content).not.toContain("supplier");
    }
  });
});
