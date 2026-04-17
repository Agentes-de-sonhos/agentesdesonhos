import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const MAX_BUSINESS_CARDS = 3;

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
  label: string | null;
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

function normalizeCard(data: any): BusinessCard {
  return {
    ...data,
    label: data.label ?? null,
    logos: (data.logos as any) || [],
    buttons: (data.buttons as any) || [],
    social_links: (data.social_links as any) || {},
  } as BusinessCard;
}

/** List all business cards for the current user. */
export function useBusinessCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cards, isLoading } = useQuery({
    queryKey: ["business-cards", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map(normalizeCard);
    },
    enabled: !!user,
  });

  const createCard = useMutation({
    mutationFn: async ({ slug, label }: { slug: string; label: string }) => {
      if (!user) throw new Error("Não autenticado");
      if ((cards?.length ?? 0) >= MAX_BUSINESS_CARDS) {
        throw new Error(`Você já atingiu o limite de ${MAX_BUSINESS_CARDS} cartões.`);
      }

      // Cards are created blank by default so each one can represent a
      // different person (partner, employee, salesperson, etc.).
      const { data, error } = await supabase
        .from("business_cards")
        .insert({
          user_id: user.id,
          slug,
          label: label.trim() || "Novo cartão",
          name: "",
          agency_name: "",
          phone: "",
          whatsapp: "",
          email: "",
          photo_url: null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Cartão criado com sucesso!");
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      if (msg.includes("Limite de") || msg.includes("limite")) {
        toast.error(msg);
      } else if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Esse slug já está em uso. Escolha outro.");
      } else {
        toast.error("Erro ao criar cartão.");
      }
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("business_cards")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Cartão excluído.");
    },
    onError: () => toast.error("Erro ao excluir cartão."),
  });

  return {
    cards: cards || [],
    isLoading,
    createCard,
    deleteCard,
    cardCount: cards?.length ?? 0,
    canCreate: (cards?.length ?? 0) < MAX_BUSINESS_CARDS,
  };
}

/** Load and update a single business card by ID. */
export function useBusinessCardById(cardId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: card, isLoading } = useQuery({
    queryKey: ["business-card", cardId],
    queryFn: async () => {
      if (!cardId || !user) return null;
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .eq("id", cardId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return normalizeCard(data);
    },
    enabled: !!cardId && !!user,
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
      queryClient.invalidateQueries({ queryKey: ["business-card", cardId] });
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
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

  return { card, isLoading, updateCard, uploadImage };
}

/**
 * @deprecated Use `useBusinessCards()` and `useBusinessCardById()` instead.
 * Returns the first card of the user for backward compatibility.
 */
export function useBusinessCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: card, isLoading } = useQuery({
    queryKey: ["business-card-legacy", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return normalizeCard(data);
    },
    enabled: !!user,
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
      queryClient.invalidateQueries({ queryKey: ["business-card-legacy"] });
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
    },
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

  return { card, isLoading, updateCard, uploadImage };
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

      return normalizeCard(data);
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
