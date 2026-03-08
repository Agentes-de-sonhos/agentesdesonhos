import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CardButton {
  text: string;
  url: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
}

export interface BusinessCard {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  title: string;
  agency_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  photo_url: string | null;
  cover_url: string | null;
  primary_color: string;
  secondary_color: string;
  logos: string[];
  buttons: CardButton[];
  social_links: SocialLinks;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBusinessCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: card, isLoading } = useQuery({
    queryKey: ["business-card", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        logos: (data.logos as any) || [],
        buttons: (data.buttons as any) || [],
        social_links: (data.social_links as any) || {},
      } as BusinessCard;
    },
    enabled: !!user,
  });

  const createCard = useMutation({
    mutationFn: async (slug: string) => {
      if (!user) throw new Error("Não autenticado");
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, phone, agency_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from("business_cards")
        .insert({
          user_id: user.id,
          slug,
          name: profile?.name || "",
          agency_name: profile?.agency_name || "",
          phone: profile?.phone || "",
          whatsapp: profile?.phone || "",
          email: user.email || "",
          photo_url: profile?.avatar_url || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-card"] });
      toast.success("Cartão criado com sucesso!");
    },
    onError: (err: any) => {
      if (err?.message?.includes("duplicate")) {
        toast.error("Esse slug já está em uso. Escolha outro.");
      } else {
        toast.error("Erro ao criar cartão.");
      }
    },
  });

  const updateCard = useMutation({
    mutationFn: async (updates: Partial<BusinessCard>) => {
      if (!card) throw new Error("Cartão não encontrado");
      const { error } = await supabase
        .from("business_cards")
        .update({
          ...updates,
          logos: updates.logos as any,
          buttons: updates.buttons as any,
          social_links: updates.social_links as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-card"] });
      toast.success("Cartão atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar cartão."),
  });

  const uploadImage = async (file: File, type: "photo" | "cover" | "logo") => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${type}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return urlData.publicUrl;
  };

  return { card, isLoading, createCard, updateCard, uploadImage };
}

export function usePublicBusinessCard(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-business-card", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      
      // Track page view
      supabase.from("business_card_stats").insert({
        card_id: data.id,
        event_type: "page_view",
      }).then();

      return {
        ...data,
        logos: (data.logos as any) || [],
        buttons: (data.buttons as any) || [],
        social_links: (data.social_links as any) || {},
      } as BusinessCard;
    },
    enabled: !!slug,
  });
}

export function generateVCard(card: BusinessCard): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${card.name}`,
    `ORG:${card.agency_name}`,
    `TITLE:${card.title}`,
  ];
  if (card.phone) lines.push(`TEL;TYPE=WORK:${card.phone}`);
  if (card.whatsapp) lines.push(`TEL;TYPE=CELL:${card.whatsapp}`);
  if (card.email) lines.push(`EMAIL:${card.email}`);
  if (card.website) lines.push(`URL:${card.website}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
