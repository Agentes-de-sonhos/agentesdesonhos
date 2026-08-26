import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
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

/** Detalhes de um processo de reserva: file, serviços congelados e histórico. */
export function useTravelFile(fileId?: string) {
  return useQuery({
    queryKey: ["travel-file", fileId],
    enabled: !!fileId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: file, error } = await sb
        .from("travel_files")
        .select("*")
        .eq("id", fileId)
        .maybeSingle();
      if (error) throw error;
      if (!file) return null;

      const typed = file as TravelFile;
      const [servicesRes, eventsRes, clientRes, quoteRes] = await Promise.all([
        sb
          .from("travel_file_services")
          .select("*")
          .eq("file_id", typed.id)
          .order("created_at", { ascending: true }),
        sb
          .from("quote_booking_request_events")
          .select("id, event_type, actor_type, payload, created_at")
          .eq("request_id", typed.current_request_id ?? typed.root_request_id)
          .order("created_at", { ascending: true }),
        typed.client_id
          ? supabase
              .from("clients")
              .select("id, name, email, phone")
              .eq("id", typed.client_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
        typed.quote_id
          ? sb
              .from("quotes")
              .select("id, status, public_access_code, client_name, destination, currency")
              .eq("id", typed.quote_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
      ]);

      return {
        file: typed,
        services: (servicesRes.data || []) as TravelFileService[],
        events: (eventsRes.data || []) as any[],
        client: (clientRes.data || null) as any,
        quote: (quoteRes.data || null) as any,
      };
    },
  });
}

/**
 * Atualizações do file e dos serviços SEMPRE por funções seguras no servidor.
 * O servidor resolve a agência pelo usuário autenticado, valida a permissão e
 * confirma que o registro pertence à agência antes de gravar.
 */
export function useTravelFileMutations(fileId?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["travel-file", fileId] });
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

  return { setStatus, setResponsibles, saveService };
}

/** Notas internas do processo — visíveis apenas para a agência. */
export function useTravelFileNotes(fileId?: string, agencyId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["travel-file-notes", fileId],
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["travel-file-notes", fileId] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await sb.rpc("travel_file_note_delete", { _note_id: noteId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["travel-file-notes", fileId] }),
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
