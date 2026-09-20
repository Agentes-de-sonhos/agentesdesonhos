import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Search, SearchX, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { buildCommunityPostUrl } from "@/lib/communityPostFocus";
import { useCommunityHiddenPosts } from "@/hooks/useCommunityHiddenPosts";
import { ConnectButton } from "./ConnectButton";
import { useCommunityMessageSearch } from "@/hooks/useCommunityMessageSearch";
import { openCommunityConversation } from "@/lib/communityChatNavigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


export const SEARCH_MIN_TERM = 2;
export const SEARCH_DEBOUNCE_MS = 300;
const RESULT_LIMIT = 12;

export type CommunitySearchFilter = "all" | "people" | "posts" | "messages";

export const SEARCH_FILTERS: { key: CommunitySearchFilter; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "people", label: "Pessoas" },
  { key: "posts", label: "Publicações" },
  { key: "messages", label: "Mensagens" },
];

/** Em "Tudo" a seção de mensagens é compacta; no filtro dedicado, completa. */
export const MESSAGES_COMPACT_LIMIT = 3;

export interface SearchPerson {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  agency_name: string | null;
}

export interface SearchPost {
  id: string;
  user_id: string;
  content: string | null;
  created_at: string;
  author?: SearchPerson;
}

/** Recorte legível do texto da publicação, sem expor dados privados. */
export function postSnippet(content: string | null | undefined, term: string): string {
  const text = (content ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "Publicação sem texto";
  const index = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  const start = index > 60 ? index - 40 : 0;
  const snippet = text.slice(start, start + 160);
  return `${start > 0 ? "…" : ""}${snippet}${start + 160 < text.length ? "…" : ""}`;
}

export function isSearchTermValid(term: string): boolean {
  return term.trim().length >= SEARCH_MIN_TERM;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

interface CommunitySearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Busca da Comunidade: pessoas e publicações visíveis ao usuário autenticado. */
export function CommunitySearchOverlay({ open, onOpenChange }: CommunitySearchOverlayProps) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<CommunitySearchFilter>("all");
  const mobileHistoryEntryRef = useRef(false);

  const closeOverlay = useCallback(() => {
    if (mobileHistoryEntryRef.current) {
      window.history.back();
      return;
    }
    onOpenChange(false);
  }, [onOpenChange]);

  const closeThen = useCallback(
    (action: () => void) => {
      if (mobileHistoryEntryRef.current) {
        window.history.back();
        window.setTimeout(action, 0);
        return;
      }
      onOpenChange(false);
      action();
    },
    [onOpenChange],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (!open) {
      setTerm("");
      setDebounced("");
      setFilter("all");
    }
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    window.history.pushState({ communitySearchOpen: true }, "");
    mobileHistoryEntryRef.current = true;
    const handlePopState = () => {
      mobileHistoryEntryRef.current = false;
      onOpenChange(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      mobileHistoryEntryRef.current = false;
    };
  }, [open, onOpenChange]);

  const enabled = open && isSearchTermValid(debounced);
  const wantsPeople = filter === "all" || filter === "people";
  const wantsPosts = filter === "all" || filter === "posts";
  const wantsMessages = filter === "all" || filter === "messages";
  const { hiddenIds, isReady: hiddenReady } = useCommunityHiddenPosts();


  const peopleQuery = useQuery({
    queryKey: ["community-search-people", debounced],
    enabled: enabled && wantsPeople,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_community_agents", {
        p_search: debounced,
        p_specialty: null,
        p_limit: RESULT_LIMIT,
        p_offset: 0,
      });
      if (error) throw error;
      return ((data ?? []) as SearchPerson[]).map((row) => ({
        user_id: row.user_id,
        name: row.name,
        avatar_url: row.avatar_url,
        agency_name: row.agency_name,
      }));
    },
  });

  const postsQuery = useQuery({
    queryKey: ["community-search-posts", debounced, hiddenIds.join(",")],
    enabled: enabled && wantsPosts && hiddenReady,
    staleTime: 30 * 1000,
    queryFn: async () => {
      let request = supabase
        .from("community_posts")
        .select("id, user_id, content, created_at")
        .ilike("content", `%${debounced}%`)
        .order("created_at", { ascending: false })
        .limit(RESULT_LIMIT);
      if (hiddenIds.length > 0) {
        request = request.not("id", "in", `(${hiddenIds.join(",")})`);
      }
      const { data, error } = await request;
      if (error) throw error;

      const posts = (data ?? []) as SearchPost[];
      if (posts.length === 0) return posts;

      const authorIds = [...new Set(posts.map((post) => post.user_id))];
      const { data: authors } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, agency_name")
        .in("user_id", authorIds);
      const byId = new Map((authors ?? []).map((a: any) => [a.user_id, a as SearchPerson]));
      return posts.map((post) => ({ ...post, author: byId.get(post.user_id) }));
    },
  });

  const messagesQuery = useCommunityMessageSearch(debounced, enabled && wantsMessages);

  const loading =
    (wantsPeople && peopleQuery.isLoading) ||
    (wantsPosts && postsQuery.isLoading) ||
    (wantsMessages && messagesQuery.isLoading);
  const failed =
    (wantsPeople && peopleQuery.isError) ||
    (wantsPosts && postsQuery.isError) ||
    (wantsMessages && messagesQuery.isError);
  const people = wantsPeople ? peopleQuery.data ?? [] : [];
  const posts = wantsPosts ? postsQuery.data ?? [] : [];
  const allMessages = wantsMessages ? messagesQuery.data ?? [] : [];
  const messages = filter === "all" ? allMessages.slice(0, MESSAGES_COMPACT_LIMIT) : allMessages;
  const empty = useMemo(
    () =>
      enabled && !loading && !failed && people.length === 0 && posts.length === 0 && messages.length === 0,
    [enabled, loading, failed, people.length, posts.length, messages.length],
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeOverlay())}>
      <DialogContent
        hideClose
        className="inset-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 pt-[env(safe-area-inset-top)] shadow-none duration-0 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=closed]:zoom-out-100 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 data-[state=open]:zoom-in-100 md:left-[50%] md:top-[50%] md:grid md:h-auto md:max-h-[85dvh] md:w-full md:max-w-xl md:translate-x-[-50%] md:translate-y-[-50%] md:gap-3 md:overflow-visible md:rounded-lg md:border md:p-5 md:shadow-lg md:duration-200"
        data-community-search-overlay
      >
        <div className="shrink-0 space-y-3 border-b border-border bg-background px-4 pb-3 pt-3 md:contents">
          <DialogHeader className="pr-0 md:pr-8">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-left text-base">Buscar na comunidade</DialogTitle>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Fechar busca"
                onClick={closeOverlay}
                className="h-9 w-9 shrink-0 md:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Pessoas, publicações ou mensagens"
              aria-label="Buscar pessoas, publicações ou mensagens"
              className="pl-9"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filtros de busca">
            {SEARCH_FILTERS.map((item) => (
              <Button
                key={item.key}
                type="button"
                role="tab"
                size="sm"
                variant={filter === item.key ? "secondary" : "ghost"}
                aria-selected={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={cn("h-8 shrink-0 px-3 text-xs", filter === item.key && "font-semibold")}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:max-h-[60vh] md:min-h-24 md:px-0 md:pb-0 md:pt-0">
          {!enabled && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Digite ao menos {SEARCH_MIN_TERM} letras para buscar.
            </p>
          )}

          {enabled && loading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
            </div>
          )}

          {enabled && failed && !loading && (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Não foi possível buscar agora.
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (wantsPeople) peopleQuery.refetch();
                  if (wantsPosts) postsQuery.refetch();
                  if (wantsMessages) messagesQuery.refetch();
                }}
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {empty && (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <SearchX className="h-5 w-5" /> Nenhum resultado encontrado.
            </div>
          )}

          {people.length > 0 && (
            <section aria-label="Pessoas" className="space-y-2" data-search-people>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pessoas
              </h3>
              {people.map((person) => (
                <div
                  key={person.user_id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={person.avatar_url || undefined} alt={person.name || "Membro"} />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      closeThen(() => navigate(`/comunidade/agente/${person.user_id}`));
                    }}
                  >
                    <p className="truncate text-sm font-semibold text-foreground">
                      {person.name || "Membro"}
                    </p>
                    {person.agency_name && (
                      <p className="truncate text-xs text-muted-foreground">{person.agency_name}</p>
                    )}
                  </button>
                  <ConnectButton targetUserId={person.user_id} targetName={person.name} />
                </div>
              ))}
            </section>
          )}

          {posts.length > 0 && (
            <section aria-label="Publicações" className="space-y-2" data-search-posts>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Publicações
              </h3>
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    closeThen(() => navigate(buildCommunityPostUrl(post.id)));
                  }}
                  className="w-full rounded-xl border border-border/60 px-3 py-2 text-left hover:bg-muted"
                >
                  <p className="truncate text-xs font-semibold text-foreground">
                    {post.author?.name || "Membro"}
                    {post.author?.agency_name && (
                      <span className="font-normal text-muted-foreground"> · {post.author.agency_name}</span>
                    )}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {postSnippet(post.content, debounced)}
                  </p>
                </button>
              ))}
            </section>
          )}

          {messages.length > 0 && (
            <section aria-label="Mensagens" className="space-y-2" data-search-messages>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mensagens
              </h3>
              {messages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  data-search-message-item
                  onClick={() => {
                    closeThen(() =>
                      openCommunityConversation({
                        conversationId: message.conversationId,
                        messageId: message.id,
                      }),
                    );
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/60 px-3 py-2 text-left hover:bg-muted"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage
                      src={message.otherUser.avatar_url || undefined}
                      alt={message.otherUser.name}
                    />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(message.otherUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {message.otherUser.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {format(new Date(message.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
                      {postSnippet(message.content, debounced)}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
