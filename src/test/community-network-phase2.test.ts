import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveRelation, mutedAuthorIds, pairFilter } from "@/hooks/useCommunityNetwork";
import {
  buildCommunityPostUrl,
  decidePostFocus,
  readTargetPostId,
} from "@/lib/communityPostFocus";
import {
  SEARCH_FILTERS,
  SEARCH_MIN_TERM,
  isSearchTermValid,
  postSnippet,
} from "@/components/community/CommunitySearchOverlay";

const read = (path: string) => readFileSync(path, "utf8");

const migration = read("drizzle/migrations/0006_community_network_phase2.sql");
const networkHook = read("src/hooks/useCommunityNetwork.ts");
const connectButton = read("src/components/community/ConnectButton.tsx");
const followItem = read("src/components/community/PostFollowMenuItem.tsx");
const minhaRede = read("src/pages/MinhaRede.tsx");
const search = read("src/components/community/CommunitySearchOverlay.tsx");
const feedHook = read("src/hooks/useCommunityFeed.ts");
const dashboardFeed = read("src/components/dashboard/CommunitySocialFeed.tsx");
const postCard = read("src/components/community/PostCard.tsx");
const bottomNav = read("src/components/layout/MobileBottomNav.tsx");
const topBar = read("src/components/layout/MobileTopBar.tsx");
const app = read("src/App.tsx");
const agencyAdminArea = read("src/components/whitelabel/admin/AgencyAdminArea.tsx");

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const conn = (over: Partial<Record<string, string>> = {}) => ({
  id: "c1",
  requester_id: ME,
  receiver_id: OTHER,
  status: "pending",
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

describe("estado da relação de conexão", () => {
  it("retorna none sem relação e para o próprio usuário", () => {
    expect(resolveRelation([], ME, OTHER).state).toBe("none");
    expect(resolveRelation([conn()], ME, ME).state).toBe("none");
    expect(resolveRelation([conn()], null, OTHER).state).toBe("none");
  });

  it("distingue enviada, recebida, aceita e recusada", () => {
    expect(resolveRelation([conn()], ME, OTHER).state).toBe("pending_sent");
    expect(
      resolveRelation([conn({ requester_id: OTHER, receiver_id: ME })], ME, OTHER).state,
    ).toBe("pending_received");
    expect(resolveRelation([conn({ status: "accepted" })], ME, OTHER).state).toBe("accepted");
    expect(resolveRelation([conn({ status: "rejected" })], ME, OTHER).state).toBe("rejected");
  });

  it("encontra a relação mesmo com remetente e destinatário invertidos", () => {
    const relation = resolveRelation(
      [conn({ id: "inv", requester_id: OTHER, receiver_id: ME, status: "accepted" })],
      ME,
      OTHER,
    );
    expect(relation.state).toBe("accepted");
    expect(relation.connectionId).toBe("inv");
  });
});

describe("banco: relações sociais mínimas e seguras", () => {
  it("impede duplicidade invertida e conexão consigo mesmo", () => {
    expect(migration).toContain(
      "CREATE UNIQUE INDEX IF NOT EXISTS connections_unique_pair",
    );
    expect(migration).toContain("LEAST(requester_id, receiver_id), GREATEST(requester_id, receiver_id)");
    expect(migration).toContain("connections_no_self CHECK (requester_id <> receiver_id)");
  });

  it("cria a tabela de acompanhamento com grants, RLS e índices", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.community_muted_authors");
    expect(migration).toContain("GRANT SELECT, INSERT, DELETE ON public.community_muted_authors TO authenticated");
    expect(migration).toContain("GRANT ALL ON public.community_muted_authors TO service_role");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain("community_muted_authors_user_idx");
    expect(migration).not.toMatch(/DROP\s+(TABLE|POLICY|COLUMN)/i);
  });

  it("não expõe dados privados nas consultas de rede", () => {
    for (const source of [networkHook, minhaRede, search]) {
      expect(source).not.toMatch(/select\([^)]*\bemail\b/);
      expect(source).not.toMatch(/select\([^)]*\bphone\b/);
    }
    expect(minhaRede).toContain('"profiles_public"');
  });
});

describe("ações do ciclo de conexão", () => {
  it("cobre enviar, cancelar, aceitar, recusar e remover", () => {
    expect(networkHook).toContain("requester_id: userId, receiver_id: targetUserId, status: \"pending\"");
    expect(networkHook).toContain("const cancelRequest");
    expect(networkHook).toContain('.update({ status: "accepted"');
    expect(networkHook).toContain("const removeConnection");
    expect(networkHook).toContain("Não é possível conectar consigo mesmo");
    expect(networkHook).toContain("toast.success");
    expect(networkHook).toContain("toast.error");
  });

  it("cria solicitações sempre em nome do usuário autenticado", () => {
    expect(networkHook).toContain("requester_id: userId");
    expect(networkHook).not.toContain("requester_id: targetUserId");
  });
});

describe("botão Conectar compartilhado pelos dois feeds", () => {
  it("esconde o botão para o próprio usuário e para conectados", () => {
    expect(connectButton).toContain("if (!currentUserId || currentUserId === targetUserId) return null;");
    expect(connectButton).toContain('if (relation.state === "accepted") return null;');
  });

  it("mostra pendente com cancelamento e aceite de recebidas", () => {
    expect(connectButton).toContain("Pendente");
    expect(connectButton).toContain("Cancelar solicitação");
    expect(connectButton).toContain("Aceitar");
    expect(connectButton).toContain("Recusar solicitação");
    expect(connectButton).toContain("event.stopPropagation();");
  });

  it("é reutilizado no dashboard, na página completa e na busca", () => {
    expect(dashboardFeed).toContain("<ConnectButton targetUserId={post.user_id}");
    expect(postCard).toContain("<ConnectButton targetUserId={post.user_id}");
    expect(search).toContain("<ConnectButton targetUserId={person.user_id}");
  });

  it("mantém o compartilhamento interno como ação própria da Fase 3", () => {
    for (const source of [dashboardFeed, postCard]) {
      expect(source).toContain("SharePostDialog");
    }
  });

});

describe("seguir e parar de seguir", () => {
  it("oferece o item no menu de três pontos para outros autores", () => {
    expect(followItem).toContain("Parar de seguir");
    expect(followItem).toContain("Seguir");
    expect(followItem).toContain("if (!currentUserId || currentUserId === authorId) return null;");
    expect(dashboardFeed).toContain("<PostFollowMenuItem authorId={post.user_id}");
    expect(postCard).toContain("<PostFollowMenuItem authorId={post.user_id}");
  });

  it("preserva editar e excluir de autores e administradores", () => {
    expect(dashboardFeed).toContain("Editar publicação");
    expect(dashboardFeed).toContain("Excluir publicação");
    expect(postCard).toContain("{isOwner && onEdit && (");
    expect(postCard).toContain("{(isOwner || isAdmin) && (");
  });

  it("não desfaz a conexão ao parar de seguir", () => {
    expect(networkHook).toContain('.from("community_muted_authors")');
    expect(networkHook).not.toMatch(/setFollowing[\s\S]{0,400}from\("connections"\)/);
  });

  it("filtra o feed no servidor preservando a paginação", () => {
    expect(feedHook).toContain('query.not("user_id", "in", `(${mutedIds.join(",")})`)');
    expect(feedHook).toContain(
      'queryKey: ["community-feed", pageSize, mutedIds.join(","), hiddenIds.join(",")]',
    );

    expect(feedHook).toContain(".range(pageParam, pageParam + pageSize)");
    expect(mutedAuthorIds([{ author_id: OTHER }, { author_id: OTHER }])).toEqual([OTHER]);
    expect(mutedAuthorIds(undefined)).toEqual([]);
  });
});

describe("Minha Rede", () => {
  it("tem as três seções e as ações de cada estado", () => {
    expect(minhaRede).toContain('title="Conexões"');
    expect(minhaRede).toContain('title="Solicitações recebidas"');
    expect(minhaRede).toContain('title="Solicitações enviadas"');
    expect(minhaRede).toContain('aria-label="Aceitar solicitação"');
    expect(minhaRede).toContain('aria-label="Recusar solicitação"');
    expect(minhaRede).toContain('aria-label="Cancelar solicitação enviada"');
    expect(minhaRede).toContain('aria-label="Remover conexão"');
  });

  it("tem estados vazio, carregamento e erro com nova tentativa", () => {
    expect(minhaRede).toContain("data-minha-rede-loading");
    expect(minhaRede).toContain("data-minha-rede-error");
    expect(minhaRede).toContain("Tentar novamente");
    expect(minhaRede).toContain("Nenhuma solicitação recebida.");
    expect(minhaRede).toContain("max-w-3xl");
  });

  it("é aberta pelo item Minha Rede e registrada como rota interna", () => {
    expect(bottomNav).toContain('const networkPath = "/comunidade/minha-rede";');
    expect(app).toContain('<Route path="/comunidade/minha-rede" element={<MinhaRede />} />');
    expect(app).toContain('<Route path="/comunidade/membros" element={<Community />} />');
  });
});

describe("busca da comunidade", () => {
  it("tem os filtros Tudo, Pessoas e Publicações", () => {
    expect(SEARCH_FILTERS.map((f) => f.label)).toEqual(["Tudo", "Pessoas", "Publicações"]);
  });

  it("exige termo mínimo e usa debounce", () => {
    expect(SEARCH_MIN_TERM).toBe(2);
    expect(isSearchTermValid(" a ")).toBe(false);
    expect(isSearchTermValid("rio")).toBe(true);
    expect(search).toContain("SEARCH_DEBOUNCE_MS");
    expect(search).toContain("setTimeout(() => setDebounced(term.trim()), SEARCH_DEBOUNCE_MS)");
  });

  it("pesquisa pessoas e publicações com estados de carregamento, vazio e erro", () => {
    expect(search).toContain('rpc("list_community_agents"');
    expect(search).toContain('.from("community_posts")');
    expect(search).toContain('.ilike("content"');
    expect(search).toContain("Buscando…");
    expect(search).toContain("Nenhum resultado encontrado.");
    expect(search).toContain("Não foi possível buscar agora.");
  });

  it("não pesquisa mensagens nesta fase", () => {
    expect(search).not.toContain("direct_messages");
    expect(search).not.toContain("community_messages");
  });

  it("gera trechos legíveis das publicações", () => {
    expect(postSnippet("", "rio")).toBe("Publicação sem texto");
    expect(postSnippet("Viagem para o Rio de Janeiro", "rio")).toContain("Rio de Janeiro");
    expect(postSnippet(`${"a".repeat(200)} destino`, "destino").startsWith("…")).toBe(true);
  });

  it("é acionada pelo campo Pesquisar do cabeçalho mobile", () => {
    expect(topBar).toContain("setSearchOpen(true)");
    expect(topBar).toContain("<CommunitySearchOverlay open={searchOpen}");
    expect(topBar).not.toContain('navigate("/comunidade/membros")');
  });
});

describe("isolamento do Site Lab Base e white-labels", () => {
  it("nada da Fase 2 é usado pela área das agências", () => {
    for (const marker of [
      "ConnectButton",
      "PostFollowMenuItem",
      "CommunitySearchOverlay",
      "MinhaRede",
      "useCommunityNetwork",
    ]) {
      expect(agencyAdminArea).not.toContain(marker);
    }
  });
});

// ============ Correções de qualidade da Fase 2 ============

const hardening = read("drizzle/migrations/0007_community_connections_hardening.sql");
const feedSection = read("src/components/community/CommunityFeedSection.tsx");
const postFocus = read("src/lib/communityPostFocus.ts");

describe("recusar e solicitar novamente", () => {
  it("recusar remove a solicitação pendente em vez de deixar linha bloqueando o par", () => {
    expect(networkHook).toContain("if (!accept) {");
    expect(networkHook).toMatch(/if \(!accept\) \{[\s\S]{0,400}\.delete\(\)/);
    expect(networkHook).not.toContain('accept ? "accepted" : "rejected"');
  });

  it("nova solicitação limpa recusa legada do par antes de inserir", () => {
    expect(networkHook).toContain('.eq("status", "rejected")');
    expect(networkHook).toContain("pairFilter(userId, targetUserId)");
    expect(networkHook).toContain('.insert({ requester_id: userId, receiver_id: targetUserId, status: "pending" })');
  });

  it("o filtro do par cobre remetente e destinatário invertidos", () => {
    const filter = pairFilter(ME, OTHER);
    expect(filter).toContain(`and(requester_id.eq.${ME},receiver_id.eq.${OTHER})`);
    expect(filter).toContain(`and(requester_id.eq.${OTHER},receiver_id.eq.${ME})`);
  });

  it("ciclo recusar -> solicitar novamente volta ao estado inicial e depois a pendente", () => {
    const pending = [conn({ requester_id: OTHER, receiver_id: ME })];
    expect(resolveRelation(pending, ME, OTHER).state).toBe("pending_received");
    const afterReject: typeof pending = [];
    expect(resolveRelation(afterReject, ME, OTHER).state).toBe("none");
    const afterNewRequest = [conn({ id: "c2", requester_id: ME, receiver_id: OTHER })];
    expect(resolveRelation(afterNewRequest, ME, OTHER).state).toBe("pending_sent");
  });

  it("mantém a prevenção de pares duplicados e invertidos", () => {
    expect(migration).toContain("connections_unique_pair");
    expect(hardening).not.toMatch(/DROP INDEX[\s\S]*connections_unique_pair/i);
    expect(hardening).not.toMatch(/DROP (POLICY|TABLE|CONSTRAINT)/i);
  });
});

describe("conexão nova começa seguindo", () => {
  it("limpa apenas o par envolvido quando a conexão passa a aceita", () => {
    expect(hardening).toContain("reset_follow_on_connection_accepted");
    expect(hardening).toContain("SECURITY DEFINER");
    expect(hardening).toContain("NEW.status = 'accepted'");
    expect(hardening).toContain("OLD.status IS DISTINCT FROM 'accepted'");
    expect(hardening).toContain("DELETE FROM public.community_muted_authors");
    expect(hardening).toContain("user_id = NEW.requester_id AND author_id = NEW.receiver_id");
    expect(hardening).toContain("user_id = NEW.receiver_id AND author_id = NEW.requester_id");
  });

  it("não permite apagar preferências de terceiros fora do par", () => {
    const deleteBlock = hardening.slice(
      hardening.indexOf("DELETE FROM public.community_muted_authors"),
      hardening.indexOf("RETURN NEW;", hardening.indexOf("DELETE FROM public.community_muted_authors")),
    );
    expect(deleteBlock).toContain("WHERE");
    expect(deleteBlock).not.toMatch(/WHERE\s+true/i);
  });

  it("atualiza o feed do usuário após aceitar", () => {
    expect(networkHook).toMatch(/if \(variables\.accept\) \{[\s\S]{0,300}community-muted-authors/);
    expect(networkHook).toMatch(/if \(variables\.accept\) \{[\s\S]{0,400}community-feed/);
  });
});

describe("UPDATE de connections endurecido", () => {
  it("congela os participantes da relação", () => {
    expect(hardening).toContain("enforce_connection_update");
    expect(hardening).toContain("NEW.requester_id <> OLD.requester_id OR NEW.receiver_id <> OLD.receiver_id");
    expect(hardening).toContain("Os participantes da conexão não podem ser alterados");
    expect(hardening).toContain("BEFORE UPDATE ON public.connections");
  });

  it("aceita apenas transições válidas e somente pelo destinatário", () => {
    expect(hardening).toContain("IF OLD.status <> 'pending' THEN");
    expect(hardening).toContain("NEW.status NOT IN ('accepted', 'rejected')");
    expect(hardening).toContain("actor <> OLD.receiver_id");
    expect(hardening).toContain("Somente o destinatário pode responder à solicitação");
  });

  it("não enfraquece a RLS existente", () => {
    expect(hardening).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
    expect(hardening).not.toMatch(/CREATE POLICY/i);
    expect(hardening).not.toMatch(/GRANT .* TO anon/i);
  });
});

describe("resultado de busca leva à publicação", () => {
  it("usa a rota do feed com o parâmetro da publicação", () => {
    expect(postFocus).toContain('export const COMMUNITY_POST_PARAM = "post"');
    expect(search).toContain("buildCommunityPostUrl(post.id)");
    expect(search).not.toContain('navigate("/comunidade/feed")');
  });

  it("decide entre focar, carregar mais páginas ou parar", () => {
    expect(
      decidePostFocus({
        targetPostId: "p1",
        loadedPostIds: ["p9", "p1"],
        hasNextPage: true,
        isFetchingNextPage: false,
        alreadyFocused: false,
      }),
    ).toEqual({ focus: true, loadMore: false });

    expect(
      decidePostFocus({
        targetPostId: "p1",
        loadedPostIds: ["p9"],
        hasNextPage: true,
        isFetchingNextPage: false,
        alreadyFocused: false,
      }),
    ).toEqual({ focus: false, loadMore: true });

    expect(
      decidePostFocus({
        targetPostId: "p1",
        loadedPostIds: ["p9"],
        hasNextPage: true,
        isFetchingNextPage: true,
        alreadyFocused: false,
      }),
    ).toEqual({ focus: false, loadMore: false });

    expect(
      decidePostFocus({
        targetPostId: "p1",
        loadedPostIds: ["p9"],
        hasNextPage: false,
        isFetchingNextPage: false,
        alreadyFocused: false,
      }),
    ).toEqual({ focus: false, loadMore: false });

    expect(
      decidePostFocus({
        targetPostId: null,
        loadedPostIds: ["p1"],
        hasNextPage: true,
        isFetchingNextPage: false,
        alreadyFocused: false,
      }),
    ).toEqual({ focus: false, loadMore: false });

    expect(
      decidePostFocus({
        targetPostId: "p1",
        loadedPostIds: ["p1"],
        hasNextPage: false,
        isFetchingNextPage: false,
        alreadyFocused: true,
      }),
    ).toEqual({ focus: false, loadMore: false });
  });

  it("lê o alvo da query string", () => {
    expect(readTargetPostId("?post=abc")).toBe("abc");
    expect(readTargetPostId("?post=%20")).toBeNull();
    expect(readTargetPostId("")).toBeNull();
    expect(buildCommunityPostUrl("abc")).toBe("/comunidade/feed?post=abc");
  });

  it("ancora cada publicação do feed e preserva a paginação", () => {
    expect(feedSection).toContain("id={communityPostElementId(item.data.id)}");
    expect(feedSection).toContain("data-community-post-anchor");
    expect(feedSection).toContain('scrollIntoView({ behavior: "smooth", block: "center" })');
    expect(feedSection).toContain("void fetchNextPage();");
    expect(feedSection).toContain("sentinelRef");
  });
});
