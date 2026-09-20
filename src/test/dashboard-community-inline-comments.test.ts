import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const feed = readFileSync("src/components/dashboard/CommunitySocialFeed.tsx", "utf8");
const fullPage = readFileSync("src/components/community/PostCard.tsx", "utf8");

describe("comentários inline no feed da Comunidade do dashboard", () => {
  it("botão Comentar não navega e expande inline", () => {
    expect(feed).not.toContain('<Link to="/comunidade">\n            <MessageCircle');
    expect(feed).toContain("onToggleComments();");
    expect(feed).toContain("event.preventDefault();");
    expect(feed).toContain("event.stopPropagation();");
    expect(feed).toContain("aria-expanded={commentsOpen}");
    expect(feed).toContain("aria-controls={commentsRegionId}");
  });

  it("mantém apenas um post expandido por vez", () => {
    expect(feed).toContain("const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);");
    expect(feed).toContain("current === post.id ? null : post.id");
    expect(feed).toContain("commentsOpen={openCommentsPostId === post.id}");
  });

  it("reutiliza mutations existentes de comentários", () => {
    expect(feed).toContain("addComment,");
    expect(feed).toContain("isAddingComment,");
    expect(feed).toContain("deleteComment,");
    expect(feed).toContain("onAddComment({ postId: post.id, content });");
    expect(feed).toContain("enabled: commentsOpen || post.comments_count > 0,");
  });

  it("dá foco ao campo e permite recolher", () => {
    expect(feed).toContain("input.focus({ preventScroll: true });");
    expect(feed).toContain('block: "nearest", behavior: "smooth"');
    expect(feed).toContain("Recolher");
    expect(feed).toContain('aria-label="Enviar comentário"');
    expect(feed).toContain('aria-label="Escreva um comentário"');
  });

  it("não altera a página completa da Comunidade", () => {
    expect(fullPage).toContain("const handleToggleComments = async () => {");
    expect(fullPage).toContain("onAddComment({ postId: post.id, content: commentText.trim() });");
  });
});
