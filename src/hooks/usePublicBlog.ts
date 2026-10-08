import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TiptapNode } from "@/lib/blog/blogUtils";

export interface PublicBlogCard {
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  cover_alt: string;
  category: { name: string; slug: string } | null;
  author_name: string;
  featured: boolean;
  published_at: string;
  updated_at: string;
}
export interface PublicBlogList {
  featured: PublicBlogCard | null;
  items: PublicBlogCard[];
  total: number;
  page: number;
  pages: number;
  categories: { name: string; slug: string }[];
}
export interface PublicBlogPost {
  post: PublicBlogCard & {
    content: TiptapNode;
    seo_title: string;
    seo_description: string;
    cta_title: string;
    cta_text: string;
  };
  related: PublicBlogCard[];
  settings: { cta_title?: string | null; cta_text?: string | null } | null;
}

async function call<T>(body: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await supabase.functions.invoke("public-blog", { body });
  if (error) {
    const status = (error as any)?.context?.status;
    if (status === 404) return null;
    throw error;
  }
  return data as T;
}

/** Status público: o link "Blog" só aparece com recurso ativo E conteúdo publicado. */
export function usePublicBlogStatus(hostname?: string | null) {
  return useQuery({
    queryKey: ["public-blog-status", hostname],
    enabled: !!hostname,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async () =>
      (await call<{ enabled: boolean; has_posts: boolean }>({ action: "status", hostname })) ?? {
        enabled: false,
        has_posts: false,
      },
  });
}

export function usePublicBlogList(hostname: string, params: { q: string; category: string; page: number }) {
  return useQuery({
    queryKey: ["public-blog-list", hostname, params],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: () => call<PublicBlogList>({ action: "list", hostname, ...params }),
  });
}

export function usePublicBlogPost(hostname: string, slug?: string) {
  return useQuery({
    queryKey: ["public-blog-post", hostname, slug],
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: () => call<PublicBlogPost>({ action: "post", hostname, slug }),
  });
}
