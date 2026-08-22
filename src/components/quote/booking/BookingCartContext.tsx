/**
 * Fonte única de verdade da seleção de serviços do ORÇAMENTO PÚBLICO.
 *
 * A seleção acontece DIRETAMENTE nos cards já renderizados no corpo do
 * orçamento (ação inline). Este provider guarda o estado, persiste em
 * localStorage, aplica as regras puras de `quoteBookingShowcase` e é
 * compartilhado por: ação inline, carrinho fixo, CTA pós-condições e o modal
 * amplo de solicitação de reserva. Nenhuma regra de negócio nova: o servidor
 * (`submit-booking-request` / `submit_quote_booking_request`) continua sendo a
 * autoridade final e o contrato do backend não muda.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { agencyNameToSlug } from "@/lib/orcamento-domain";
import { formatQuoteCurrency, getQuoteCurrencyInfo } from "@/lib/quoteCurrency";
import { formatFileNumber } from "@/lib/travelFiles";
import { serviceCompactDigest, serviceDigestTitle } from "@/lib/quoteServiceDigest";
import {
  bookingCtaLabel,
  bookingSelectionTotal,
  buildBookingSelectionModel,
  effectiveSelectionIds,
  quoteHasLinkedClient,
  type BookingSelectionModel,
} from "@/lib/quoteBookingSelection";
import {
  applyShowcaseSelection,
  buildBookingShowcase,
  cardAction,
  legacyWizardStorageKey,
  pruneShowcaseSelection,
  resolveInitialSelection,
  selectionBlockedReason,
  selectionCount,
  serializeSelection,
  showcaseStorageKey,
  showcaseValidation,
  type CardAction,
  type ShowcaseBlock,
  type ShowcaseModel,
} from "@/lib/quoteBookingShowcase";
import { flyToCart, findCartTarget } from "@/lib/bookingCartFly";
import type { Quote, QuoteChoiceGroup, QuoteService } from "@/types/quote";
import type { AgentProfile } from "@/hooks/useAgentProfile";

export interface BookingSuccessState {
  protocol: string;
  fileNumber: string;
  services: string[];
}

export interface ServiceCartState {
  action: CardAction;
  selected: boolean;
  /** false quando um novo clique não pode remover (escolha única obrigatória). */
  canRemove: boolean;
  blockedReason: string | null;
}

export interface BookingCartValue {
  enabled: boolean;
  packageMode: boolean;
  hideAmounts: boolean;
  /** Quantidade efetiva de serviços (inclui obrigatórios/pacote). */
  count: number;
  effectiveIds: string[];
  selected: string[];
  stateFor: (serviceId: string) => ServiceCartState | null;
  toggle: (serviceId: string, origin?: HTMLElement | null) => void;
  remove: (serviceId: string) => void;
  blockedNotice: string | null;
  clearBlockedNotice: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  openCart: () => void;
  showcase: ShowcaseModel;
  model: BookingSelectionModel;
  services: QuoteService[];
  /** Orçamento completo — necessário para reaproveitar as condições de pagamento. */
  quote: Quote | null;
  total: number | null;
  totalLabel: string;
  formatAmount: (value: number) => string;
  validationError: string | null;
  ctaLabel: string;
  hasLinkedClient: boolean;
  submitting: boolean;
  submitError: string | null;
  success: BookingSuccessState | null;
  submit: (input: {
    name: string;
    email: string;
    whatsapp: string;
    notes: string;
  }) => Promise<void>;
  resetSubmitError: () => void;
}

const DISABLED: BookingCartValue = {
  enabled: false,
  packageMode: false,
  hideAmounts: false,
  count: 0,
  effectiveIds: [],
  selected: [],
  stateFor: () => null,
  toggle: () => {},
  remove: () => {},
  blockedNotice: null,
  clearBlockedNotice: () => {},
  cartOpen: false,
  setCartOpen: () => {},
  openCart: () => {},
  showcase: { blocks: [], hasSections: false, hasChoiceSets: false, packageMode: false },
  model: {
    packageMode: false,
    hideAmounts: false,
    requiredServices: [],
    optionalServices: [],
    groups: [],
    allServices: [],
  },
  services: [],
  quote: null,
  total: null,
  totalLabel: "Valor total",
  formatAmount: (v) => String(v),
  validationError: null,
  ctaLabel: "Solicitar reserva",
  hasLinkedClient: false,
  submitting: false,
  submitError: null,
  success: null,
  submit: async () => {},
  resetSubmitError: () => {},
};

const BookingCartContext = createContext<BookingCartValue>(DISABLED);

export function useBookingCart(): BookingCartValue {
  return useContext(BookingCartContext);
}

interface ProviderProps {
  quote: Quote;
  agentProfile?: AgentProfile | null;
  agencySlugOverride?: string;
  accessCodeOverride?: string;
  children: React.ReactNode;
}

export function BookingCartProvider({
  quote,
  agentProfile,
  agencySlugOverride,
  accessCodeOverride,
  children,
}: ProviderProps) {
  const enabled =
    (quote as any)?.booking_requests_enabled === true && (quote?.services?.length ?? 0) > 0;

  const services = (quote?.services || []) as QuoteService[];
  const groups = (((quote as any)?.choice_groups || []) as QuoteChoiceGroup[]) || [];

  const model = useMemo(
    () => buildBookingSelectionModel(quote, services, groups),
    [quote, services, groups],
  );
  const showcase = useMemo(
    () => buildBookingShowcase(model, quote?.sections || [], groups),
    [model, quote?.sections, groups],
  );

  const blockByService = useMemo(() => {
    const map = new Map<string, ShowcaseBlock>();
    for (const block of showcase.blocks) {
      for (const option of block.options) map.set(option.service.id, block);
    }
    return map;
  }, [showcase]);

  const quoteId = String(quote?.id || "");
  const storageKey = showcaseStorageKey(quoteId);
  const legacyKey = legacyWizardStorageKey(quoteId);

  const [selected, setSelected] = useState<string[]>([]);
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<BookingSuccessState | null>(null);
  const idempotencyKey = useRef<string>("");
  const flyCleanups = useRef<Array<() => void>>([]);

  // Retoma a seleção anterior e migra o formato antigo do wizard, se existir.
  useEffect(() => {
    if (!enabled || !quoteId) return;
    try {
      const { selected: initial, migrated } = resolveInitialSelection(
        model,
        localStorage.getItem(storageKey),
        localStorage.getItem(legacyKey),
      );
      setSelected(initial);
      if (migrated) localStorage.setItem(storageKey, serializeSelection(initial));
    } catch {
      /* armazenamento indisponível: segue sem retomar */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, quoteId, services.length]);

  // Nunca deixa animação pendente ao desmontar.
  useEffect(
    () => () => {
      flyCleanups.current.forEach((fn) => fn());
      flyCleanups.current = [];
    },
    [],
  );

  const persist = useCallback(
    (next: string[]) => {
      const pruned = pruneShowcaseSelection(model, next);
      setSelected(pruned);
      try {
        localStorage.setItem(storageKey, serializeSelection(pruned));
      } catch {
        /* ignora falha de armazenamento */
      }
    },
    [model, storageKey],
  );

  const stateFor = useCallback(
    (serviceId: string): ServiceCartState | null => {
      const block = blockByService.get(serviceId);
      if (!block) return null;
      const action = cardAction(block);
      const isSelected = action === "locked" || selected.includes(serviceId);
      const blockedReason = selectionBlockedReason(block, selected, serviceId);
      return {
        action,
        selected: isSelected,
        canRemove: action !== "locked" && !blockedReason,
        blockedReason,
      };
    },
    [blockByService, selected],
  );

  const runFly = useCallback((serviceId: string, origin?: HTMLElement | null) => {
    if (!origin) return;
    const target = findCartTarget();
    if (!target) return;
    const service = services.find((s) => s.id === serviceId);
    const imageUrl = service ? serviceCompactDigest(service).images[0] || null : null;
    const cleanup = flyToCart(
      origin.getBoundingClientRect(),
      target.getBoundingClientRect(),
      { imageUrl: typeof imageUrl === "string" && /^https?:\/\//.test(imageUrl) ? imageUrl : null },
    );
    flyCleanups.current.push(cleanup);
  }, [services]);

  const toggle = useCallback(
    (serviceId: string, origin?: HTMLElement | null) => {
      const block = blockByService.get(serviceId);
      if (!block || cardAction(block) === "locked") return;
      const blocked = selectionBlockedReason(block, selected, serviceId);
      if (blocked) {
        setBlockedNotice(blocked);
        return;
      }
      setBlockedNotice(null);
      const next = applyShowcaseSelection(block, selected, serviceId);
      const added = !selected.includes(serviceId) && next.includes(serviceId);
      persist(next);
      if (added) runFly(serviceId, origin);
    },
    [blockByService, selected, persist, runFly],
  );

  const remove = useCallback(
    (serviceId: string) => {
      const block = blockByService.get(serviceId);
      if (block) {
        toggle(serviceId, null);
        return;
      }
      persist(selected.filter((id) => id !== serviceId));
    },
    [blockByService, toggle, persist, selected],
  );

  const { currency } = getQuoteCurrencyInfo(quote);
  const formatAmount = useCallback(
    (value: number) => formatQuoteCurrency(value, currency),
    [currency],
  );

  const effectiveIds = effectiveSelectionIds(model, selected);
  const { total, label: totalLabel } = bookingSelectionTotal(quote, model, selected);
  const validationError = showcaseValidation(showcase, model, selected);
  const count = selectionCount(model, selected);
  const ctaLabel = bookingCtaLabel(model, effectiveIds.length);
  const hasLinkedClient = quoteHasLinkedClient(quote);

  const agencySlug =
    agencySlugOverride || agencyNameToSlug((agentProfile as any)?.agency_name || "");
  const publicCode =
    accessCodeOverride || ((quote as any)?.public_access_code as string | undefined);

  const submit = useCallback(
    async (input: { name: string; email: string; whatsapp: string; notes: string }) => {
      if (!agencySlug || !publicCode) {
        setSubmitError("Não foi possível identificar este orçamento. Fale com o seu consultor.");
        return;
      }
      if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
      setSubmitting(true);
      setSubmitError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("submit-booking-request", {
          body: {
            agency_slug: agencySlug,
            code: publicCode,
            selected_service_ids: effectiveIds,
            client_name: hasLinkedClient ? "" : input.name.trim(),
            client_email: hasLinkedClient ? "" : input.email.trim(),
            client_whatsapp: hasLinkedClient ? "" : input.whatsapp.trim(),
            client_notes: input.notes.trim() || null,
            disclaimer_accepted: true,
            idempotency_key: idempotencyKey.current,
          },
        });
        if (fnError) {
          let message = "Não foi possível enviar sua solicitação agora. Tente novamente.";
          try {
            const ctx = (fnError as any)?.context;
            if (ctx?.text) {
              const body = JSON.parse(await ctx.text());
              if (body?.error) message = String(body.error);
            }
          } catch {
            /* mantém a mensagem genérica */
          }
          setSubmitError(message);
          return;
        }
        if ((data as any)?.error) {
          setSubmitError(String((data as any).error));
          return;
        }
        const chosen = services.filter((s) => effectiveIds.includes(s.id));
        setSuccess({
          protocol: String((data as any)?.protocol || ""),
          fileNumber: formatFileNumber((data as any)?.file_number),
          services: chosen.map((s) => serviceDigestTitle(s)),
        });
      } catch {
        setSubmitError("Não foi possível enviar sua solicitação agora. Tente novamente.");
      } finally {
        setSubmitting(false);
      }
    },
    [agencySlug, publicCode, effectiveIds, hasLinkedClient, services],
  );

  const openCart = useCallback(() => {
    if (!success) idempotencyKey.current = idempotencyKey.current || crypto.randomUUID();
    setSubmitError(null);
    setCartOpen(true);
  }, [success]);

  const value = useMemo<BookingCartValue>(
    () =>
      enabled
        ? {
            enabled: true,
            packageMode: model.packageMode,
            hideAmounts: model.hideAmounts,
            count,
            effectiveIds,
            selected,
            stateFor,
            toggle,
            remove,
            blockedNotice,
            clearBlockedNotice: () => setBlockedNotice(null),
            cartOpen,
            setCartOpen,
            openCart,
            showcase,
            model,
            services,
            quote,
            total,
            totalLabel,
            formatAmount,
            validationError,
            ctaLabel,
            hasLinkedClient,
            submitting,
            submitError,
            success,
            submit,
            resetSubmitError: () => setSubmitError(null),
          }
        : DISABLED,
    [
      enabled,
      model,
      count,
      effectiveIds,
      selected,
      stateFor,
      toggle,
      remove,
      blockedNotice,
      cartOpen,
      openCart,
      showcase,
      services,
      quote,
      total,
      totalLabel,
      formatAmount,
      validationError,
      ctaLabel,
      hasLinkedClient,
      submitting,
      submitError,
      success,
      submit,
    ],
  );

  return <BookingCartContext.Provider value={value}>{children}</BookingCartContext.Provider>;
}
