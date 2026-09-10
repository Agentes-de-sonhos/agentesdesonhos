import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  AgencyCompany,
  TravelFile,
  TravelFileServiceStatus,
  TravelFileStatus,
  TravelFileListItem,
  TravelFileNote,
  TravelFileService,
} from "@/types/travelFile";

const sb = supabase as any;

export interface AgencyTeamOption {
  id: string;
  name: string;
  roleTitle: string | null;
}

/** Colaboradores da própria agência — usado para definir responsáveis do file. */
export function useAgencyTeamDirectory(enabled = true) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["agency-team-directory", user?.id],
    enabled: !!user?.id && enabled,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<AgencyTeamOption[]> => {
      const { data, error } = await sb.rpc("agency_team_directory");
      if (error) throw error;
      return ((data || []) as any[])
        .filter((m) => m.status === "active")
        .map((m) => ({
          id: m.member_id as string,
          name: (m.full_name as string) || "Colaborador",
          roleTitle: (m.role_title as string) || null,
        }));
    },
  });

  const byId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const member of query.data ?? []) map[member.id] = member.name;
    return map;
  }, [query.data]);

  return { members: query.data ?? [], memberNames: byId, isLoading: query.isLoading };
}

/** Ordenações aceitas pelo servidor (travel_files_page). */
export type TravelFilesSort = "recent" | "oldest" | "travel" | "updated" | "number";

export const TRAVEL_FILES_SORTS: { value: TravelFilesSort; label: string }[] = [
  { value: "recent", label: "Solicitação mais recente" },
  { value: "oldest", label: "Solicitação mais antiga" },
  { value: "updated", label: "Última atualização" },
  { value: "travel", label: "Data da viagem" },
  { value: "number", label: "Nº do file" },
];

export interface TravelFilesQueryParams {
  search?: string;
  statuses?: string[] | null;
  from?: string | null;
  to?: string | null;
  responsibleTeamMemberId?: string | null;
  /** Somente processos ainda não abertos pelo usuário. */
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
  sort?: TravelFilesSort;
}

export interface TravelFilesCounts {
  all: number;
  new: number;
  awaiting_reconfirmation: number;
  partially_available: number;
  awaiting_client: number;
  confirmed: number;
  in_operation: number;
  completed: number;
  cancelled: number;
  overdue: number;
  unread: number;
}

export interface TravelFilesCapabilities {
  manage: boolean;
  assign: boolean;
  revenue: boolean;
  margin: boolean;
  commission: boolean;
  commission_manage: boolean;
  /** Alterar valor vendido e custo do serviço (reservations.financial.manage). */
  financial_manage: boolean;
}

export interface TravelFilesPageResult {
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  sort: TravelFilesSort;
  items: TravelFileListItem[];
  counts: TravelFilesCounts;
  can: TravelFilesCapabilities;
}

const EMPTY_COUNTS: TravelFilesCounts = {
  all: 0,
  new: 0,
  awaiting_reconfirmation: 0,
  partially_available: 0,
  awaiting_client: 0,
  confirmed: 0,
  in_operation: 0,
  completed: 0,
  cancelled: 0,
  overdue: 0,
  unread: 0,
};

const EMPTY_CAN: TravelFilesCapabilities = {
  manage: false,
  assign: false,
  revenue: false,
  margin: false,
  commission: false,
  commission_manage: false,
  financial_manage: false,
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Normaliza a linha devolvida pelo servidor no formato usado pela interface. */
export function mapTravelFileRow(row: any): TravelFileListItem {
  return {
    ...(row as TravelFile),
    requested_amount: toNumber(row.requested_amount),
    reconfirmed_amount: row.reconfirmed_amount == null ? null : toNumber(row.reconfirmed_amount),
    final_sale_amount: row.final_sale_amount == null ? null : toNumber(row.final_sale_amount),
    clientName: row.client_name ?? null,
    companyName: row.company_name ?? null,
    servicesCount: toNumber(row.services_count),
    serviceNames: (row.service_names || []) as string[],
    unread: !!row.unread,
    responsibleName: row.responsible_name ?? null,
  } as TravelFileListItem;
}

/**
 * Central de Reservas: busca, filtros e paginação executados NO SERVIDOR
 * (RPC travel_files_page). A função resolve a agência pelo usuário autenticado,
 * exige reservations.view e remove valores financeiros sem permissão.
 */
export function useTravelFilesPage(params: TravelFilesQueryParams, enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pageSize = params.pageSize ?? 20;
  const page = params.page ?? 1;

  const query = useQuery({
    queryKey: [
      "travel-files-page",
      user?.id,
      params.search ?? "",
      (params.statuses ?? []).join(","),
      params.from ?? "",
      params.to ?? "",
      params.responsibleTeamMemberId ?? "",
      params.unreadOnly ? "unread" : "",
      page,
      pageSize,
      params.sort ?? "recent",
    ],
    enabled: !!user?.id && enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<TravelFilesPageResult> => {
      const { data, error } = await sb.rpc("travel_files_page", {
        _search: params.search?.trim() || null,
        _statuses: params.statuses && params.statuses.length ? params.statuses : null,
        _from: params.from || null,
        _to: params.to || null,
        _responsible: params.responsibleTeamMemberId || null,
        _unread: !!params.unreadOnly,
        _page: page,
        _page_size: pageSize,
        _sort: params.sort ?? "recent",
      });
      if (error) throw error;
      const payload = (data || {}) as any;
      return {
        total: toNumber(payload.total),
        page: toNumber(payload.page) || page,
        pages: Math.max(1, toNumber(payload.pages) || 1),
        pageSize: toNumber(payload.page_size) || pageSize,
        sort: (payload.sort as TravelFilesSort) || params.sort || "recent",
        items: ((payload.items || []) as any[]).map(mapTravelFileRow),
        counts: { ...EMPTY_COUNTS, ...(payload.counts || {}) },
        can: { ...EMPTY_CAN, ...(payload.can || {}) },
      };
    },
  });

  const markViewed = useMutation({
    mutationFn: async (file: { id: string; agency_id: string }) => {
      if (!user?.id) return;
      await sb.from("travel_file_views").upsert(
        {
          file_id: file.id,
          agency_id: file.agency_id,
          user_id: user.id,
          viewed_at: new Date().toISOString(),
        },
        { onConflict: "file_id,user_id" },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-files-page"] });
      queryClient.invalidateQueries({ queryKey: ["travel-files-summary"] });
    },
  });

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    /** Total de páginas calculado pelo servidor. */
    pages: query.data?.pages ?? 1,
    /** Página efetivamente devolvida (o servidor ajusta quando excede o total). */
    serverPage: query.data?.page ?? page,
    counts: query.data?.counts ?? EMPTY_COUNTS,
    can: query.data?.can ?? EMPTY_CAN,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    markViewed: markViewed.mutateAsync,
  };
}

/** Contadores da Central de Reservas sem carregar a lista (etiquetas e badges). */
export function useTravelFilesSummary(enabled = true) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["travel-files-summary", user?.id],
    enabled: !!user?.id && enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<TravelFilesCounts> => {
      const { data, error } = await sb.rpc("travel_files_page", { _page: 1, _page_size: 1 });
      if (error) throw error;
      return { ...EMPTY_COUNTS, ...(((data || {}) as any).counts || {}) };
    },
  });
  return {
    counts: query.data ?? EMPTY_COUNTS,
    unreadCount: query.data?.unread ?? 0,
    isLoading: query.isLoading,
  };
}

/**
 * Detalhes de um processo de reserva: ficha, serviços, histórico e contratante.
 * Sempre pela função segura travel_file_detail — o servidor resolve a agência,
 * exige reservations.view, junta o histórico do site com o histórico interno e
 * remove valores financeiros de quem não tem permissão para vê-los.
 */
export function useTravelFile(fileId?: string) {
  const { user } = useAuth();
  return useQuery({
    // A identidade entra na chave: o que um usuário pode ver (inclusive valores)
    // nunca é reaproveitado por outra conta na mesma aba.
    queryKey: ["travel-file", user?.id ?? "anon", fileId],
    enabled: !!fileId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await sb.rpc("travel_file_detail", { _file_id: fileId });
      if (error) throw error;
      const payload = (data || null) as any;
      if (!payload?.file) return null;
      return {
        file: payload.file as TravelFile,
        services: (payload.services || []) as TravelFileService[],
        events: (payload.events || []) as any[],
        client: (payload.client || null) as any,
        company: (payload.company || null) as any,
        contact: (payload.contact || null) as any,
        quote: (payload.quote || null) as any,
        can: { ...EMPTY_CAN, ...(payload.can || {}) } as TravelFilesCapabilities,
      };
    },
  });
}

export interface ManualReservationInput {
  manualKey: string;
  contractorType: "individual" | "company";
  clientId?: string | null;
  companyId?: string | null;
  contactClientId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  tripName?: string | null;
  primaryDestination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  adultsCount?: number;
  childrenCount?: number;
  currency?: string;
}

const manualPayload = (input: ManualReservationInput) => ({
  manual_key: input.manualKey,
  contractor_type: input.contractorType,
  client_id: input.clientId || null,
  company_id: input.companyId || null,
  contact_client_id: input.contactClientId || null,
  contact_name: input.contactName || null,
  contact_email: input.contactEmail || null,
  contact_phone: input.contactPhone || null,
  trip_name: input.tripName || null,
  primary_destination: input.primaryDestination || null,
  start_date: input.startDate || null,
  end_date: input.endDate || null,
  adults_count: input.adultsCount ?? 1,
  children_count: input.childrenCount ?? 0,
  currency: input.currency || "BRL",
});

/**
 * Edição: envia apenas o que a tela realmente mudou. Campo ausente é
 * preservado no servidor — moeda, valores e contato escrito à mão continuam
 * como estavam quando a tela não mexe neles.
 */
export type ManualReservationPatch = Partial<Omit<ManualReservationInput, "manualKey">>;

const manualPatchPayload = (input: ManualReservationPatch) => {
  const map: Array<[keyof ManualReservationPatch, string]> = [
    ["contractorType", "contractor_type"],
    ["clientId", "client_id"],
    ["companyId", "company_id"],
    ["contactClientId", "contact_client_id"],
    ["contactName", "contact_name"],
    ["contactEmail", "contact_email"],
    ["contactPhone", "contact_phone"],
    ["tripName", "trip_name"],
    ["primaryDestination", "primary_destination"],
    ["startDate", "start_date"],
    ["endDate", "end_date"],
    ["adultsCount", "adults_count"],
    ["childrenCount", "children_count"],
    ["currency", "currency"],
  ];
  const payload: Record<string, unknown> = {};
  for (const [key, column] of map) {
    const value = input[key];
    if (value === undefined) continue;
    payload[column] = value === "" ? null : value;
  }
  return payload;
};

/**
 * Cadastro manual de reserva. O registro nasce como RASCUNHO e não cria
 * oportunidade, operação, orçamento, carteira nem lançamento financeiro.
 * A chave de intenção evita dois cadastros no clique duplo.
 */
export function useCreateManualReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: ManualReservationInput,
    ): Promise<{ fileId: string; fileNumber: string; duplicate: boolean }> => {
      const { data, error } = await sb.rpc("travel_file_create_manual", {
        _payload: manualPayload(input),
      });
      if (error) throw error;
      const payload = (data || {}) as any;
      return {
        fileId: payload.file_id as string,
        fileNumber: (payload.file_number_display as string) || "",
        duplicate: !!payload.duplicate,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-files-page"] });
      queryClient.invalidateQueries({ queryKey: ["travel-files-summary"] });
    },
  });
}

/** Empresas contratantes da agência (tabela companies), com busca no servidor. */
export function useAgencyCompanies(search: string, enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["agency-companies", user?.id, search.trim()],
    enabled: !!user?.id && enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<AgencyCompany[]> => {
      const { data, error } = await sb.rpc("agency_companies_search", {
        _search: search.trim() || null,
        _limit: 20,
      });
      if (error) throw error;
      return (data || []) as AgencyCompany[];
    },
  });

  const saveCompany = useMutation({
    mutationFn: async (input: {
      companyId?: string | null;
      name: string;
      tradeName?: string | null;
      cnpj?: string | null;
      email?: string | null;
      phone?: string | null;
      contactClientId?: string | null;
    }): Promise<string> => {
      const { data, error } = await sb.rpc("agency_company_save", {
        _payload: {
          company_id: input.companyId || null,
          name: input.name,
          trade_name: input.tradeName || null,
          cnpj: input.cnpj || null,
          email: input.email || null,
          phone: input.phone || null,
          contact_client_id: input.contactClientId || null,
        },
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agency-companies"] }),
  });

  return {
    companies: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    saveCompany,
  };
}

/**
 * Atualizações do file e dos serviços SEMPRE por funções seguras no servidor.
 * O servidor resolve a agência pelo usuário autenticado, valida a permissão e
 * confirma que o registro pertence à agência antes de gravar.
 */
export function useTravelFileMutations(fileId?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    // A chave do detalhe inclui a identidade; invalidamos todo o grupo.
    queryClient.invalidateQueries({ queryKey: ["travel-file"] });
    queryClient.invalidateQueries({ queryKey: ["travel-files-page"] });
    queryClient.invalidateQueries({ queryKey: ["travel-files-summary"] });
    queryClient.invalidateQueries({ queryKey: ["agency-admin-dashboard"] });
  };

  const setStatus = useMutation({
    mutationFn: async ({ status, reason }: { status: TravelFileStatus; reason?: string | null }) => {
      const { error } = await sb.rpc("travel_file_set_status", {
        _file_id: fileId,
        _status: status,
        _reason: reason?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setResponsibles = useMutation({
    mutationFn: async ({
      commercial,
      operations,
    }: {
      commercial: string | null;
      operations: string | null;
    }) => {
      const { error } = await sb.rpc("travel_file_set_responsibles", {
        _file_id: fileId,
        _commercial: commercial,
        _operations: operations,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const saveService = useMutation({
    mutationFn: async ({
      id,
      status,
      financials,
      responsibleTeamMemberId,
    }: {
      id: string;
      status?: TravelFileServiceStatus;
      financials?: {
        reconfirmed_amount?: number | null;
        sold_amount?: number | null;
        cost_amount?: number | null;
        commission_amount?: number | null;
      };
      responsibleTeamMemberId?: string | null;
    }) => {
      const { error } = await sb.rpc("travel_file_service_save", {
        _service_id: id,
        _status: status ?? null,
        _reconfirmed_amount: financials?.reconfirmed_amount ?? null,
        _sold_amount: financials?.sold_amount ?? null,
        _cost_amount: financials?.cost_amount ?? null,
        _commission_amount: financials?.commission_amount ?? null,
        _responsible: responsibleTeamMemberId ?? null,
        _touch_financials: !!financials,
        _touch_responsible: responsibleTeamMemberId !== undefined,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Dados básicos do rascunho manual (nunca altera files vindos do site). */
  const saveManualData = useMutation({
    mutationFn: async (input: ManualReservationPatch) => {
      const { error } = await sb.rpc("travel_file_update_manual", {
        _file_id: fileId,
        _payload: manualPatchPayload(input),
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Serviço acrescentado ou editado à mão, de forma progressiva. */
  const saveManualService = useMutation({
    mutationFn: async (input: {
      serviceId?: string | null;
      serviceType: string;
      productName: string;
      supplierId?: string | null;
      supplierName?: string | null;
      destination?: string | null;
      city?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      quantity?: number;
      status?: TravelFileServiceStatus;
      notes?: string | null;
      requestedAmount?: number | null;
      currency?: string | null;
    }) => {
      const { error } = await sb.rpc("travel_file_service_manual_save", {
        _payload: {
          service_id: input.serviceId || null,
          file_id: fileId,
          service_type: input.serviceType,
          product_name: input.productName,
          supplier_id: input.supplierId || null,
          supplier_name: input.supplierName || null,
          destination: input.destination || null,
          city: input.city || null,
          start_date: input.startDate || null,
          end_date: input.endDate || null,
          quantity: input.quantity ?? 1,
          // A situação só é enviada quando informada: o servidor preserva a
          // situação atual na edição e usa "solicitado" apenas na criação.
          ...(input.status ? { status: input.status } : {}),
          // Observações: string vazia apaga no servidor; omitir preserva.
          ...(input.notes === undefined ? {} : { notes: input.notes ?? "" }),
          ...(input.requestedAmount == null ? {} : { requested_amount: input.requestedAmount }),
          currency: input.currency || null,
        },
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { setStatus, setResponsibles, saveService, saveManualData, saveManualService };
}

/** Notas internas do processo — visíveis apenas para a agência. */
export function useTravelFileNotes(fileId?: string, agencyId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["travel-file-notes", user?.id ?? "anon", fileId],
    enabled: !!fileId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<TravelFileNote[]> => {
      const { data, error } = await sb
        .from("travel_file_notes")
        .select("*")
        .eq("file_id", fileId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TravelFileNote[];
    },
  });

  const addNote = useMutation({
    mutationFn: async ({ body, authorName }: { body: string; authorName?: string | null }) => {
      if (!fileId || !user?.id) throw new Error("Processo não identificado.");
      const { error } = await sb.rpc("travel_file_note_add", {
        _file_id: fileId,
        _body: body,
        _author_name: authorName || null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["travel-file-notes"] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await sb.rpc("travel_file_note_delete", { _note_id: noteId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["travel-file-notes"] }),
  });

  return { notes: query.data ?? [], isLoading: query.isLoading, addNote, deleteNote };
}

/** Números de file por orçamento — usado para a etiqueta em Meus Projetos. */
export function useQuoteFileNumbers(enabled = true) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["quote-file-numbers", user?.id],
    enabled: !!user?.id && enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await sb
        .from("travel_files")
        .select("id, quote_id, file_number_display")
        .not("quote_id", "is", null);
      if (error) throw error;
      const map: Record<string, { id: string; number: string }> = {};
      for (const row of (data || []) as any[]) {
        if (row.quote_id && !map[row.quote_id]) {
          map[row.quote_id] = { id: row.id, number: row.file_number_display };
        }
      }
      return map;
    },
  });
  return { quoteFiles: query.data ?? {}, isLoading: query.isLoading };
}
