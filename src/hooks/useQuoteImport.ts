/**
 * Persistência da importação do "Novo Orçamento".
 *
 * Reaproveita as tabelas e regras existentes (`quotes`, `quote_sections`,
 * `quote_services`) e nunca altera o orçamento/roteiro de origem.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  buildQuoteDuplicatePayload,
  importedItemToServiceRow,
  type ImportedItemDraft,
  type QuoteImportOverrides,
} from "@/lib/quoteImportSources";

function deepClone<T>(value: T): T {
  try {
    return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value ?? null));
  } catch {
    return JSON.parse(JSON.stringify(value ?? null));
  }
}

export function useQuoteImport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["quotes"] });

  /** Duplica um orçamento existente como base do novo, aplicando os dados revisados. */
  const importFromQuote = async (sourceId: string, overrides: QuoteImportOverrides) => {
    if (!user) throw new Error("Usuário não autenticado");
    setIsImporting(true);
    try {
      // RLS garante que apenas orçamentos da própria agência são legíveis.
      const { data: source, error: srcErr } = await supabase
        .from("quotes").select("*").eq("id", sourceId).single();
      if (srcErr || !source) throw srcErr || new Error("Orçamento de origem não encontrado");

      const { data: newQuote, error: insErr } = await supabase
        .from("quotes")
        .insert({ ...buildQuoteDuplicatePayload(source as any, overrides), user_id: user.id } as any)
        .select()
        .single();
      if (insErr || !newQuote) throw insErr || new Error("Não foi possível criar o orçamento");

      // Seções (mantêm o agrupamento dos serviços)
      const sectionIdMap = new Map<string, string>();
      const { data: srcSections } = await (supabase as any)
        .from("quote_sections").select("*").eq("quote_id", sourceId).order("order_index", { ascending: true });
      if (srcSections?.length) {
        const { data: newSections } = await (supabase as any)
          .from("quote_sections")
          .insert(srcSections.map((sec: any) => ({
            quote_id: newQuote.id,
            user_id: user.id,
            title: sec.title,
            order_index: sec.order_index,
            destination: sec.destination ?? null,
            start_date: sec.start_date ?? null,
            end_date: sec.end_date ?? null,
            service_type: sec.service_type ?? null,
          })))
          .select();
        for (const src of srcSections) {
          const created = (newSections || []).find(
            (n: any) => n.order_index === src.order_index && n.title === src.title,
          );
          if (created) sectionIdMap.set(src.id, created.id);
        }
      }

      // Serviços — imagens seguem por referência (sem novo upload)
      const { data: services } = await supabase
        .from("quote_services").select("*").eq("quote_id", sourceId).order("order_index");
      if (services?.length) {
        const rows = services.map((s: any) => ({
          quote_id: newQuote.id,
          service_type: s.service_type,
          service_data: deepClone(s.service_data),
          amount: s.amount,
          order_index: s.order_index,
          option_label: s.option_label,
          description: s.description,
          image_url: s.image_url,
          image_urls: Array.isArray(s.image_urls) ? [...s.image_urls] : [],
          is_custom_payment: s.is_custom_payment ?? false,
          payment_type: s.payment_type ?? null,
          installments: s.installments ?? null,
          entry_value: s.entry_value ?? null,
          discount_type: s.discount_type ?? null,
          discount_value: s.discount_value ?? null,
          payment_method: s.payment_method ?? null,
          section_id: s.section_id ? sectionIdMap.get(s.section_id) ?? null : null,
        }));
        const { error: svcErr } = await supabase.from("quote_services").insert(rows as any);
        if (svcErr) throw svcErr;
      }

      invalidate();
      return newQuote as { id: string };
    } finally {
      setIsImporting(false);
    }
  };

  /** Cria um orçamento novo com apenas os itens aprovados na revisão do roteiro. */
  const importFromItems = async (overrides: QuoteImportOverrides, items: ImportedItemDraft[]) => {
    if (!user) throw new Error("Usuário não autenticado");
    if (!items.length) throw new Error("Nenhum item aprovado para importar");
    setIsImporting(true);
    try {
      const { data: newQuote, error } = await supabase
        .from("quotes")
        .insert({
          user_id: user.id,
          client_id: overrides.client_id || null,
          client_name: overrides.client_name,
          destination: overrides.destination,
          start_date: overrides.start_date,
          end_date: overrides.end_date,
          adults_count: overrides.adults_count,
          children_count: overrides.children_count,
          status: "draft",
          currency: overrides.currency ?? "BRL",
          currency_mode: overrides.currency_mode ?? "fixed",
          exchange_rate: overrides.exchange_rate ?? null,
          investment_summary_layout: "grouped",
        } as any)
        .select()
        .single();
      if (error || !newQuote) throw error || new Error("Não foi possível criar o orçamento");

      const rows = items.map((item, idx) => importedItemToServiceRow(item, newQuote.id, idx));
      const { error: svcErr } = await supabase.from("quote_services").insert(rows as any);
      if (svcErr) throw svcErr;

      const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      if (total > 0) {
        await supabase.from("quotes").update({ total_amount: total } as any).eq("id", newQuote.id);
      }

      invalidate();
      return newQuote as { id: string };
    } finally {
      setIsImporting(false);
    }
  };

  return { importFromQuote, importFromItems, isImporting };
}
