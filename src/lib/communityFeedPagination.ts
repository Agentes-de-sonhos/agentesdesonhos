import type { CommunityPost } from "@/types/community-members";

export interface CommunityFeedPage {
  items: CommunityPost[];
  nextOffset?: number;
}

export function buildCommunityFeedPage(
  rows: CommunityPost[],
  pageSize: number,
  offset: number,
): CommunityFeedPage {
  const hasNextPage = rows.length > pageSize;
  return {
    items: rows.slice(0, pageSize),
    nextOffset: hasNextPage ? offset + pageSize : undefined,
  };
}

export function mergeUniqueCommunityPages(pages: CommunityFeedPage[]): CommunityPost[] {
  const byId = new Map<string, CommunityPost>();
  for (const page of pages) {
    for (const post of page.items) byId.set(post.id, post);
  }
  return [...byId.values()];
}