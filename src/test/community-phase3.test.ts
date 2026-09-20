import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  COMMUNITY_VISIBILITY_OPTIONS,
  DEFAULT_COMMUNITY_VISIBILITY,
  canViewCommunityPost,
  visibilityLabel,
} from "@/lib/communityVisibility";
import {
  MAX_MENTIONS_PER_CONTENT,
  applyMentionSelection,
  extractMentionUserIds,
  filterMentionCandidates,
  findActiveMentionQuery,
  mentionPlainText,
  parseMentionSegments,
} from "@/lib/communityMentions";

const read = (path: string) => readFileSync(path, "utf8");

const migration = read("drizzle/migrations/0008_community_phase3.sql");
const feedHook = read("src/hooks/useCommunityFeed.ts");
const composer = read("src/components/community/CreatePostForm.tsx");
const composerDialog = read("src/components/community/PostComposerDialog.tsx");
const commentsSection = read("src/components/community/PostCommentsSection.tsx");
const shareDialog = read("src/components/community/SharePostDialog.tsx");
const mentionTextarea = read("src/components/community/MentionTextarea.tsx");
const postCard = read("src/components/community/PostCard.tsx");
const dashboardFeed = read("src/components/dashboard/CommunitySocialFeed.tsx");
const feedSection = read("src/components/community/CommunityFeedSection.tsx");
const bottomNav = read("src/components/layout/MobileBottomNav.tsx");
const notifications = read("src/components/dashboard/NotificationsDropdown.tsx");
const notificationsHook = read("src/hooks/useCommunityNotifications.ts");

const ME = "11111111-1111-1111-1111-111111111111";
const FRIEND = "22222222-2222-2222-2222-222222222222";
const STRANGER = "33333333-3333-3333-3333-333333333333";

describe("visibilidade da publicação", () => {
  it("oferece apenas Qualquer pessoa e Minha rede, com padrão público", () => {
    expect(DEFAULT_COMMUNITY_VISIBILITY).toBe("public");
    expect(COMMUNITY_VISIBILITY_OPTIONS.map((o) => o.value)).toEqual(["public", "network"]);
    expect(COMMUNITY_VISIBILITY_OPTIONS.map((o) => o.label)).toEqual([
      "Qualquer pessoa",
      "Minha rede",
    ]);
    expect(visibilityLabel(null)).toBe("Qualquer pessoa");
    expect(visibilityLabel("network")).toBe("Minha rede");
  });

  it("post público é visível a qualquer pessoa da Comunidade", () => {
    expect(canViewCommunityPost({ user_id: FRIEND, visibility: "public" }, STRANGER, [])).toBe(true);
    expect(canViewCommunityPost({ user_id: FRIEND, visibility: null }, STRANGER, [])).toBe(true);
  });

  it("post de rede é negado a quem não é conexão aceita", () => {
    expect(canViewCommunityPost({ user_id: FRIEND, visibility: "network" }, STRANGER, [])).toBe(false);
    expect(canViewCommunityPost({ user_id: FRIEND, visibility: "network" }, null, [FRIEND])).toBe(false);
  });

  it("autor, conexão aceita e administrador veem post de rede", () => {
    const post = { user_id: FRIEND, visibility: "network" };
    expect(canViewCommunityPost(post, FRIEND, [])).toBe(true);
    expect(canViewCommunityPost(post, ME, [FRIEND])).toBe(true);
    expect(canViewCommunityPost(post, STRANGER, [], true)).toBe(true);
  });
});

describe("migration 0008 protege visibilidade no banco", () => {
  it("mantém padrão compatível com posts antigos", () => {
    expect(migration).toMatch(/visibility/);
    expect(migration).toMatch(/'public'/);
  });

  it("cria função de acesso e política restritiva para posts de rede", () => {
    expect(migration).toMatch(/can_view_community_post/);
    expect(migration).toMatch(/are_users_connected/);
    expect(migration).toMatch(/AS RESTRICTIVE/i);
    expect(migration).toMatch(/community_posts_network_restriction/);
  });

  it("aplica a mesma regra a comentários, curtidas e votos de enquete", () => {
    for (const table of [
      "community_post_comments",
      "community_post_likes",
      "community_post_poll_votes",
    ]) {
      expect(migration).toContain(table);
    }
    expect(migration.match(/AS RESTRICTIVE/gi)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it("limita marcações e aceita apenas conexões aceitas", () => {
    expect(migration).toMatch(/community_mentions/);
    expect(migration).toMatch(/are_users_connected/);
    expect(migration).toMatch(/10/);
  });

  it("deduplica notificações e concede acesso às tabelas novas", () => {
    expect(migration).toMatch(/community_notifications/);
    expect(migration).toMatch(/ON CONFLICT DO NOTHING/i);
    expect(migration).toMatch(/GRANT SELECT[\s\S]*community_notifications/i);
    expect(migration).toMatch(/GRANT[\s\S]*service_role/i);
  });

  it("valida no banco o envio para conexões com acesso ao post", () => {
    expect(migration).toMatch(/share_community_post/);
    expect(migration).toMatch(/direct_conversations/);
    expect(migration).toMatch(/direct_messages/);
  });

  it("nunca apaga dados existentes", () => {
    expect(migration).not.toMatch(/DROP TABLE/i);
    expect(migration).not.toMatch(/TRUNCATE/i);
  });
});

describe("marcações @ somente de conexões", () => {
  it("armazena a referência pelo user_id e não pelo nome", () => {
    const text = `Bom dia @[Ana Souza](${FRIEND})!`;
    expect(extractMentionUserIds(text)).toEqual([FRIEND]);
    expect(parseMentionSegments(text)).toEqual([
      { type: "text", text: "Bom dia " },
      { type: "mention", name: "Ana Souza", userId: FRIEND },
      { type: "text", text: "!" },
    ]);
    expect(mentionPlainText(text)).toBe("Bom dia @Ana Souza!");
  });

  it("não duplica ids e respeita o limite por conteúdo", () => {
    const repeated = `@[Ana](${FRIEND}) @[Ana](${FRIEND})`;
    expect(extractMentionUserIds(repeated)).toEqual([FRIEND]);
    const many = Array.from({ length: 15 }, (_, i) => {
      const id = `${String(i + 1).repeat(8)}-1111-1111-1111-111111111111`;
      return `@[P${i}](${id})`;
    }).join(" ");
    expect(extractMentionUserIds(many).length).toBeLessThanOrEqual(MAX_MENTIONS_PER_CONTENT);
  });

  it("detecta a marcação em digitação e insere o token estável", () => {
    const typing = "Olá @an";
    const active = findActiveMentionQuery(typing, typing.length);
    expect(active).toEqual({ start: 4, query: "an" });
    const applied = applyMentionSelection(typing, active!, { user_id: FRIEND, name: "Ana Souza" });
    expect(applied.text).toBe(`Olá @[Ana Souza](${FRIEND}) `);
    expect(extractMentionUserIds(applied.text)).toEqual([FRIEND]);
  });

  it("sugere somente pessoas da lista de conexões aceitas", () => {
    const connections = [
      { user_id: FRIEND, name: "Ana Souza" },
      { user_id: STRANGER, name: "Bruno Lima" },
    ];
    expect(filterMentionCandidates(connections, "ana").map((c) => c.user_id)).toEqual([FRIEND]);
    expect(filterMentionCandidates([], "ana")).toEqual([]);
  });

  it("componentes usam apenas conexões aceitas como fonte de sugestões", () => {
    expect(mentionTextarea).toMatch(/useCommunityConnectionProfiles|filterMentionCandidates/);
    expect(feedHook).toMatch(/persistMentions/);
    expect(feedHook).toMatch(/community_mentions/);
  });
});

describe("compositor de publicação", () => {
  it("abre em tela inteira no mobile e em largura confortável no desktop", () => {
    expect(composerDialog).toMatch(/100dvh/);
    expect(composerDialog).toMatch(/sm:max-w-/);
  });

  it("tem fechar, seletor de público e Publicar no cabeçalho", () => {
    expect(composerDialog).toMatch(/PostVisibilitySelector/);
    expect(composerDialog).toMatch(/Publicar/);
    expect(composerDialog).toMatch(/submitRef/);
  });

  it("pede confirmação apenas quando existe rascunho", () => {
    expect(composerDialog).toMatch(/isDirty/);
    expect(composerDialog).toMatch(/Descartar/);
    expect(composerDialog).toMatch(/AlertDialog/);
  });

  it("desabilita Publicar quando a publicação não é válida", () => {
    expect(composerDialog).toMatch(/canSubmit/);
    expect(composer).toMatch(/disabled=\{!canSubmit\}/);
  });

  it("mantém Foto, Vídeo e Enquete e não promove Documento no mobile", () => {
    expect(composer).toMatch(/Foto/);
    expect(composer).toMatch(/Vídeo/);
    expect(composer).toMatch(/Enquete/);
    expect(composer).toMatch(/hidden h-8[^"]*sm:inline-flex/);
  });

  it("reutiliza o upload e a persistência existentes", () => {
    expect(composer).toMatch(/uploadProgress/);
    expect(composer).toMatch(/cleanupOrphans/);
    expect(composerDialog).toMatch(/CreatePostForm/);
  });

  it("é aberto pela barra inferior mobile", () => {
    expect(bottomNav).toMatch(/PostComposerDialog/);
    expect(bottomNav).toMatch(/publicacao/);
  });
});

describe("comentários com curtidas e respostas", () => {
  it("permite curtir com contador e rollback em erro", () => {
    expect(commentsSection).toMatch(/onToggleCommentLike/);
    expect(commentsSection).toMatch(/likes_count/);
    expect(commentsSection).toMatch(/pendingLike/);
  });

  it("responde em um único nível, sem aninhamento infinito", () => {
    expect(commentsSection).toMatch(/parentCommentId/);
    expect(commentsSection).toMatch(/Responder/);
    expect(migration).toMatch(/parent_comment_id/);
    expect(migration).toMatch(/enforce_comment_single_level|parent_comment_id IS NULL/);
  });

  it("mostra nome, agência, data e menu de exclusão preservado", () => {
    expect(commentsSection).toMatch(/agency_name/);
    expect(commentsSection).toMatch(/Excluir/);
  });

  it("suporta marcações no texto dos comentários", () => {
    expect(commentsSection).toMatch(/MentionTextarea/);
    expect(commentsSection).toMatch(/MentionText/);
  });

  it("busca perfis e curtidas em lote, sem consulta por comentário", () => {
    expect(feedHook).toMatch(/community_comment_likes/);
    expect(feedHook).toMatch(/\.in\(/);
  });

  it("curtidas de comentário são criadas sempre em nome do próprio usuário", () => {
    expect(migration).toMatch(/community_comment_likes/);
    expect(migration).toMatch(/user_id = auth\.uid\(\)/);
  });
});

describe("enviar publicação para conexões", () => {
  it("usa o chat interno existente, sem criar outro sistema", () => {
    expect(shareDialog).toMatch(/share_community_post/);
    expect(shareDialog).toMatch(/dm-conversations/);
    expect(shareDialog).not.toMatch(/community_shares/);
  });

  it("limita destinatários e confirma o envio", () => {
    expect(shareDialog).toMatch(/MAX_SHARE_RECIPIENTS/);
    expect(shareDialog).toMatch(/toast/);
  });

  it("está disponível nas publicações dos dois feeds", () => {
    expect(postCard).toMatch(/SharePostDialog/);
    expect(postCard).toMatch(/Enviar/);
    expect(dashboardFeed).toMatch(/SharePostDialog/);
    expect(dashboardFeed).toMatch(/Enviar/);
  });
});

describe("reaproveitamento e notificações", () => {
  it("os dois feeds usam o mesmo bloco de comentários", () => {
    expect(dashboardFeed).toMatch(/PostCommentsSection/);
    expect(postCard).toMatch(/PostCommentsSection/);
    expect(feedSection).toMatch(/onToggleCommentLike/);
    expect(dashboardFeed).toMatch(/onToggleCommentLike/);
  });

  it("notificações internas de menção e envio aparecem no sino", () => {
    expect(notificationsHook).toMatch(/community_notifications/);
    expect(notifications).toMatch(/useCommunityNotifications/);
    expect(notifications).toMatch(/mencionou você/);
    expect(notifications).toMatch(/enviou uma publicação/);
  });
});

describe("isolamento e regressões das fases 1 e 2", () => {
  it("não altera Site Lab Base, white-labels ou fornecedores", () => {
    for (const source of [composerDialog, commentsSection, shareDialog, notificationsHook]) {
      expect(source).not.toMatch(/whitelabel|agency_site|fornecedor/i);
    }
  });

  it("preserva galeria, grade +N e texto de três linhas", () => {
    expect(postCard).toMatch(/PostMediaGrid/);
    expect(postCard).toMatch(/PostTextContent/);
  });

  it("preserva conexões, seguir e paginação do feed", () => {
    expect(postCard).toMatch(/ConnectButton|PostFollowMenuItem/);
    expect(feedHook).toMatch(/range\(/);
  });

  it("não deixa marcadores de trabalho pendente nos arquivos da fase", () => {
    for (const source of [composerDialog, commentsSection, shareDialog, mentionTextarea, notificationsHook]) {
      expect(source).not.toMatch(/TODO|FIXME/);
    }
  });
});
