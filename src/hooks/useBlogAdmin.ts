import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BlogSnapshot, BlogStatus } from "@/lib/blog/blogUtils";

export interface BlogPostRow {
  id: string;
  agency_id: string;
  slug: string;
  status: BlogStatus;
  draft: BlogSnapshot;
  draft_updated_at: string;
  published: BlogSnapshot | null;
  published_at: string | null;
  published_updated_at: string | null;
  scheduled_at: string | null;
  schedule_timezone: string | null;
  created_at: string;
  updated_at: string;
}
export interface BlogCategory {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
}
export interface BlogSettings {
  agency_id: string;
  cta_title: string | null;
  cta_text: string | null;
  timezone: string;
  default_author_name: string | null;
}

const sb = supabase as any;

export function useBlogPosts(agencyId?: string | null) {
  return useQuery({
    queryKey: ["blog-posts", agencyId],
    enabled: !!agencyId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await sb
        .from("site_blog_posts")
        .select("id, agency_id, slug, status, draft, draft_updated_at, published, published_at, published_updated_at, scheduled_at, schedule_timezone, created_at, updated_at")
        .eq("agency_id", agencyId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BlogPostRow[];
    },
  });
}

export function useBlogCategories(agencyId?: string | null) {
  return useQuery({
    queryKey: ["blog-categories", agencyId],
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await sb.from("site_blog_categories").select("*").eq("agency_id", agencyId).order("name");
      if (error) throw error;
      return (data ?? []) as BlogCategory[];
    },
  });
}

export function useBlogSettings(agencyId?: string | null) {
  return useQuery({
    queryKey: ["blog-settings", agencyId],
    enabled: !!agencyId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await sb.from("site_blog_settings").select("*").eq("agency_id", agencyId).maybeSingle();
      return (data ?? null) as BlogSettings | null;
    },
  });
}

/** Domínio público principal (apenas titular/admin conseguem ler; membros recebem null). */
export function useAgencyPublicHost(agencyId?: string | null) {
  return useQuery({
    queryKey: ["blog-public-host", agencyId],
    enabled: !!agencyId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await sb
        .from("agency_public_domains")
        .select("hostname, is_primary")
        .eq("user_id", agencyId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .limit(1);
      return (data?.[0]?.hostname as string | undefined) ?? null;
    },
  });
}

export async function blogAction(postId: string, action: string, at?: string, timezone?: string) {
  const { data, error } = await sb.rpc("blog_post_action", {
    p_post_id: postId,
    p_action: action,
    p_at: at ?? null,
    p_timezone: timezone ?? null,
  });
  if (error) throw new Error("Não foi possível concluir a ação agora.");
  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function ensureUniqueSlug(agencyId: string, base: string, exceptId?: string): Promise<string> {
  const { data } = await sb.from("site_blog_posts").select("id, slug").eq("agency_id", agencyId).like("slug", `${base}%`);
  const taken = new Set(((data ?? []) as { id: string; slug: string }[]).filter((r) => r.id !== exceptId).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 200; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now().toString(36)}`;
}
