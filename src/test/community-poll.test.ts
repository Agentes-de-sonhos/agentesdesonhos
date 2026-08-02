import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const dashboard = readFileSync("src/components/dashboard/CommunitySocialFeed.tsx", "utf-8");
const fullCard = readFileSync("src/components/community/PostCard.tsx", "utf-8");
const poll = readFileSync("src/components/community/PostPoll.tsx", "utf-8");
const hook = readFileSync("src/hooks/useCommunityFeed.ts", "utf-8");

describe("Community poll rendering", () => {
  it("dashboard and full community card share the same poll component", () => {
    expect(dashboard).toContain('import { PostPoll } from "@/components/community/PostPoll"');
    expect(fullCard).toContain('import { PostPoll } from "./PostPoll"');
    expect(dashboard).toContain("<PostPoll post={post}");
    expect(fullCard).toContain("<PostPoll post={post}");
  });

  it("no duplicated inline poll markup remains", () => {
    expect(dashboard).not.toContain("poll.options.map");
    expect(fullCard).not.toContain("poll.options.map");
    expect(poll).toContain("poll.options.map");
  });

  it("poll renders question, all options and total votes", () => {
    expect(poll).toContain("{poll.question}");
    expect(poll).toContain("{o.text}");
    expect(poll).toMatch(/total === 1 \? "voto" : "votos"/);
  });

  it("poll is rendered above the like/comment bar in the dashboard card", () => {
    const pollIdx = dashboard.indexOf("<PostPoll post={post}");
    const likeIdx = dashboard.indexOf("border-t border-border/40 flex items-center");
    expect(pollIdx).toBeGreaterThan(-1);
    expect(likeIdx).toBeGreaterThan(pollIdx);
  });

  it("posts without a poll render nothing extra", () => {
    expect(dashboard).toContain("{(post as any).poll && (");
    expect(poll).toContain("if (!poll || !poll.question || !poll.options?.length) return null;");
  });

  it("highlights the user's own choice and shows results after voting", () => {
    expect(poll).toContain("const isMine = userVote === o.id;");
    expect(poll).toContain("aria-pressed={isMine}");
    expect(poll).toContain("{pct}% · {count}");
  });

  it("blocks a second vote client-side and keeps DB single-vote guarantee", () => {
    expect(poll).toContain("disabled={hasVoted || !onVote || !user || isVoting}");
    expect(hook).toContain('onConflict: "post_id,user_id"');
  });

  it("loads poll votes in a single batched query (no N+1)", () => {
    expect(hook).toContain('.in("post_id", pollPostIds)');
    const inQueries = hook.match(/community_post_poll_votes/g) || [];
    expect(inQueries.length).toBeLessThanOrEqual(2);
  });

  it("dashboard wires the shared vote mutation", () => {
    expect(dashboard).toContain("onVotePoll={votePoll}");
    expect(hook).toContain("votePoll: votePoll.mutate");
  });

  it("editing keeps the poll untouched unless explicitly provided", () => {
    expect(hook).toContain("if (poll !== undefined) patch.poll = poll;");
  });
});