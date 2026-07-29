import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Download, FileText, Loader2, MessageCircle, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Sale } from '@/types/financial';
import type { ContractPayload } from '@/types/contracts';
import { useAgencyContractTemplate, useSaleContracts } from '@/hooks/useSaleContracts';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { maskDocument, validateDocument } from '@/lib/documentMask';
import {
  buildContractNumber,
  buildContractPayload,
  formatDateBR,
  formatMoney,
  hashPayload,
  validateContractPayload,
  type ContractDraftOverrides,
} from '@/lib/saleContractData';
import { generateSaleContractPdf } from '@/lib/generateSaleContractPdf';
import { useSupportWhatsApp } from '@/hooks/usePlatformSetting';
import { useSaleTravelers } from './useSaleTravelers';
import { QuickTravelerDialog } from './QuickTravelerDialog';

interface Props {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Bloco visual padrão das seções do formulário. */
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function SaleContractDialog({ sale, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const supportWhatsApp = useSupportWhatsApp();
  const [overrides, setOverrides] = useState<ContractDraftOverrides>({});
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState('dados');
  const [docTouched, setDocTouched] = useState(false);
  const documentRef = useRef<HTMLInputElement>(null);
  const emissionCityInitialized = useRef(false);
  const [manualClientId, setManualClientId] = useState<string | null>(null);
  const [quickTravelerOpen, setQuickTravelerOpen] = useState(false);

  const { data: templateData, isLoading: loadingTemplate } = useAgencyContractTemplate();
  const { contracts, createContract, logAction } = useSaleContracts(sale?.id);

  const { data: saleData, isLoading: loadingSale } = useQuery({
    queryKey: ['sale-contract-source', sale?.id],
    enabled: open && !!sale?.id,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [products, payments, client, profile] = await Promise.all([
        supabase.from('sale_products').select('*').eq('sale_id', sale!.id),
        supabase.from('customer_payments').select('*').eq('sale_id', sale!.id).order('payment_date'),
        sale!.client_id
          ? supabase.from('clients').select('id,name,email,phone,city').eq('id', sale!.client_id).maybeSingle()
          : Promise.resolve({ data: null } as { data: null }),
        supabase
          .from('profiles')
          .select('name, agency_name, cnpj, phone, city, state, avatar_url')
          .eq('user_id', user!.id)
          .maybeSingle(),
      ]);

      // Operadoras / consolidadoras vinculadas aos serviços da venda
      const operatorIds = Array.from(
        new Set(
          ((products.data ?? []) as { operator_id?: string | null }[])
            .map((p) => p.operator_id)
            .filter((v): v is string => !!v),
        ),
      );
      const operatorNames: Record<string, string> = {};
      if (operatorIds.length) {
        const { data: ops } = await supabase
          .from('tour_operators')
          .select('id,name')
          .in('id', operatorIds);
        (ops ?? []).forEach((o: { id: string; name: string }) => {
          operatorNames[o.id] = o.name;
        });
      }

      return {
        products: (products.data ?? []) as never[],
        payments: (payments.data ?? []) as never[],
        client: (client.data ?? null) as never,
        operatorNames,
        profile: (profile.data ?? null) as {
          name?: string | null;
          agency_name?: string | null;
          cnpj?: string | null;
          city?: string | null;
        } | null,
      };
    },
  });

  const {
    clientId: resolvedClientId,
    source: clientSource,
    candidates: clientCandidates,
    travelers,
    refetch: refetchTravelers,
  } = useSaleTravelers(sale, open, manualClientId);

  useEffect(() => {
    if (!open) {
      setManualClientId(null);
      setQuickTravelerOpen(false);
    }
  }, [open]);

  const nextRevision = (contracts[0]?.revision ?? 0) + 1;

  // Cidade de emissão sugerida pelo modelo da agência (ou pelo perfil).
  const suggestedEmissionCity =
    templateData?.template?.header_config?.emission_city || saleData?.profile?.city || '';

  useEffect(() => {
    if (!open) {
      emissionCityInitialized.current = false;
      return;
    }
    if (emissionCityInitialized.current || !suggestedEmissionCity) return;
    emissionCityInitialized.current = true;
    setOverrides((prev) => (prev.emission_city ? prev : { ...prev, emission_city: suggestedEmissionCity }));
  }, [open, suggestedEmissionCity]);

  const payload: ContractPayload | null = useMemo(() => {
    if (!sale || !saleData) return null;
    return buildContractPayload({
      sale,
      products: saleData.products,
      payments: saleData.payments,
      client: saleData.client,
      travelers,
      agencyProfile: saleData.profile,
      operatorNames: saleData.operatorNames,
      template: templateData?.template ?? null,
      sections: templateData?.sections ?? [],
      overrides,
      contractNumber: buildContractNumber(sale.id, nextRevision),
      revision: nextRevision,
    });
  }, [sale, saleData, travelers, templateData, overrides, nextRevision]);

  const docState = validateDocument(overrides.client_document ?? '');
  const docError = docState.isEmpty ? null : docState.error;

  const issues = useMemo(() => (payload ? validateContractPayload(payload) : []), [payload]);
  const blocking = useMemo(() => {
    const base = issues.filter((i) => i.severity === 'error');
    if (docError) {
      return [
        ...base.filter((i) => i.field !== 'client_document'),
        { field: 'client_document', message: `${docError} — corrija o documento do contratante.`, severity: 'error' as const },
      ];
    }
    return base;
  }, [issues, docError]);
  const warnings = issues.filter((i) => i.severity === 'warning');

  const set = <K extends keyof ContractDraftOverrides>(key: K, value: ContractDraftOverrides[K]) =>
    setOverrides((prev) => ({ ...prev, [key]: value }));

  const setMoney = (key: 'discounts' | 'taxes' | 'service_fee' | 'down_payment' | 'paid_to_supplier') =>
    (value: number | null) => setOverrides((prev) => ({ ...prev, [key]: value ?? undefined }));

  const goToDocument = () => {
    setTab('dados');
    setDocTouched(true);
    setTimeout(() => {
      documentRef.current?.focus();
      documentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
  };

  const insuranceMode: 'contratado' | 'recusado' | 'nao_informado' = overrides.insurance_contracted
    ? 'contratado'
    : overrides.insurance_refusal_ack
      ? 'recusado'
      : 'nao_informado';

  const handleGenerate = async () => {
    if (!payload || blocking.length) return;
    setGenerating(true);
    try {
      const documentHash = hashPayload(payload);
      await createContract.mutateAsync({
        payload,
        templateId: templateData?.template?.id ?? null,
        templateVersion: templateData?.template?.version ?? null,
        revision: nextRevision,
        supersedesId: contracts[0]?.id ?? null,
        documentHash,
      });
      await generateSaleContractPdf(payload, { download: true });
      setTab('versoes');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar contrato');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadExisting = async (contractId: string, stored: ContractPayload) => {
    await generateSaleContractPdf(stored, { download: true });
    void logAction(contractId, 'downloaded');
  };

  const hasTemplate = !!templateData?.template;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90dvh] max-h-[90dvh] overflow-hidden flex flex-col gap-3 bg-background p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Contrato da venda
          </DialogTitle>
          <DialogDescription>
            {sale ? `${sale.client_name} • ${sale.destination}` : ''}
          </DialogDescription>
        </DialogHeader>

        {loadingTemplate || loadingSale ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !hasTemplate ? (
          <div className="py-8 space-y-4">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Modelo de contrato ainda não configurado</AlertTitle>
              <AlertDescription>
                O texto jurídico do contrato é definido individualmente para cada agência. Envie o seu modelo
                para a equipe responsável e, assim que for cadastrado, a geração de contratos ficará liberada
                aqui — com os seus dados, sua identidade visual e o seu texto.
              </AlertDescription>
            </Alert>
            <Button asChild className="gap-2" disabled={!supportWhatsApp}>
              <a
                href={`https://wa.me/${supportWhatsApp}?text=${encodeURIComponent(
                  [
                    'Olá! Quero cadastrar o modelo de contrato da minha agência.',
                    `Agência: ${saleData?.profile?.agency_name || '—'}`,
                    `CNPJ: ${saleData?.profile?.cnpj || '—'}`,
                    `Usuário: ${saleData?.profile?.name || '—'}`,
                  ].join('\n'),
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                Solicitar cadastro do meu contrato
              </a>
            </Button>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="w-full justify-start shrink-0 bg-muted/60 p-1">
              <TabsTrigger value="dados" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Dados
              </TabsTrigger>
              <TabsTrigger value="revisao" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Revisão
              </TabsTrigger>
              <TabsTrigger value="versoes" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Versões ({contracts.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 sm:pr-3 pb-4">
              <TabsContent value="dados" className="space-y-4 mt-4">
                <FormSection
                  title="Contratante"
                  description="Dados da pessoa (ou empresa) que assina o contrato."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="CPF / CNPJ"
                      required
                      htmlFor="contract-document"
                      error={docTouched ? docError : null}
                      hint="Aceita CPF (11 dígitos) ou CNPJ (14 dígitos). Pode colar com ou sem pontuação."
                    >
                      <Input
                        id="contract-document"
                        ref={documentRef}
                        inputMode="numeric"
                        value={maskDocument(overrides.client_document ?? '')}
                        onChange={(e) => set('client_document', maskDocument(e.target.value))}
                        onBlur={() => setDocTouched(true)}
                        aria-invalid={!!(docTouched && docError)}
                        className={cn(
                          'tabular-nums',
                          docTouched && docError && 'border-destructive focus-visible:ring-destructive',
                        )}
                        placeholder="000.000.000-00"
                      />
                    </Field>
                    <Field label="Endereço completo" htmlFor="contract-address">
                      <Input
                        id="contract-address"
                        value={overrides.client_address ?? ''}
                        onChange={(e) => set('client_address', e.target.value)}
                        placeholder="Ex.: Rua das Palmeiras, 120 — Centro, São Paulo/SP, 01010-000"
                      />
                    </Field>
                    <Field label="Nacionalidade" htmlFor="contract-nationality">
                      <Input
                        id="contract-nationality"
                        value={overrides.client_nationality ?? ''}
                        onChange={(e) => set('client_nationality', e.target.value)}
                        placeholder="Ex.: Brasileira"
                      />
                    </Field>
                    <Field
                      label="Responsável financeiro"
                      htmlFor="contract-financial-responsible"
                      hint="Preencha somente se for diferente do contratante."
                    >
                      <Input
                        id="contract-financial-responsible"
                        value={overrides.financial_responsible ?? ''}
                        onChange={(e) => set('financial_responsible', e.target.value)}
                        placeholder="Ex.: Maria Souza (mãe do contratante)"
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  title="Passageiros"
                  description="Selecione quem será incluído no contrato. A lista vem dos viajantes da ficha do cliente."
                >
                  {!resolvedClientId ? (
                    <div className="space-y-3">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Venda sem cliente vinculado</AlertTitle>
                        <AlertDescription className="text-xs">
                          {clientCandidates.length > 1
                            ? 'Encontramos mais de um cliente com este nome na sua agência. Selecione o correto para carregar os viajantes.'
                            : 'Esta venda guarda apenas o nome do cliente. Vincule-a a um cliente da sua carteira para usar os viajantes já cadastrados.'}
                        </AlertDescription>
                      </Alert>
                      {clientCandidates.length > 1 && (
                        <div className="space-y-2">
                          {clientCandidates.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setManualClientId(c.id)}
                              className="flex w-full items-center justify-between rounded-lg border border-border bg-background p-2.5 text-left text-sm hover:bg-muted/40"
                            >
                              <span className="font-medium">{c.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {c.email || c.phone || 'sem contato'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : travelers.length ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        {travelers.map((t) => {
                          const selectedIds = overrides.passenger_ids ?? travelers.map((x) => x.id);
                          const checked = selectedIds.includes(t.id);
                          const info = passengerInfo(t, sale?.start_date ?? null);
                          return (
                            <label
                              key={t.id}
                              className="flex items-start gap-3 rounded-lg border border-border bg-background p-2.5 text-sm hover:bg-muted/40 transition-colors cursor-pointer"
                            >
                              <Checkbox
                                className="mt-0.5"
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const next = v
                                    ? [...selectedIds, t.id]
                                    : selectedIds.filter((id) => id !== t.id);
                                  set('passenger_ids', next);
                                }}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">{t.nome_completo}</span>
                                  {info.category && (
                                    <Badge variant="secondary" className="text-[10px]">{info.category}</Badge>
                                  )}
                                  {t.is_responsavel && (
                                    <Badge variant="outline" className="text-[10px]">Contratante</Badge>
                                  )}
                                </span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {info.details}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setQuickTravelerOpen(true)}
                      >
                        <UserPlus className="h-4 w-4" /> Adicionar passageiro
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-8 text-center">
                      <Users className="h-8 w-8 text-muted-foreground/60" />
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Este cliente ainda não tem viajantes cadastrados. Cadastre agora sem sair do contrato.
                      </p>
                      <Button type="button" size="sm" className="gap-2" onClick={() => setQuickTravelerOpen(true)}>
                        <UserPlus className="h-4 w-4" /> Cadastrar passageiro agora
                      </Button>
                    </div>
                  )}
                </FormSection>

                <FormSection
                  title="Viagem e serviços"
                  description="Complementa o destino e as datas já registrados na venda."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Cidade de origem"
                      htmlFor="contract-origin"
                      hint="Cidade de partida dos passageiros. Ex.: São Paulo/SP."
                    >
                      <Input
                        id="contract-origin"
                        value={overrides.trip_origin ?? ''}
                        onChange={(e) => set('trip_origin', e.target.value)}
                        placeholder="Ex.: São Paulo/SP"
                      />
                    </Field>
                    <Field
                      label="Cidade de emissão"
                      htmlFor="contract-emission-city"
                      hint={
                        suggestedEmissionCity
                          ? `Preenchida automaticamente a partir do seu cadastro (${suggestedEmissionCity}). Aparece no fecho do contrato.`
                          : 'Cidade que aparece no fecho do contrato, antes das assinaturas.'
                      }
                    >
                      <Input
                        id="contract-emission-city"
                        value={overrides.emission_city ?? ''}
                        onChange={(e) => set('emission_city', e.target.value)}
                        placeholder="Ex.: Belo Horizonte/MG"
                      />
                    </Field>
                    <Field
                      label="Serviços inclusos"
                      htmlFor="contract-included"
                      className="sm:col-span-2"
                      hint="Um item por linha. Ex.: Aéreo ida e volta / Hospedagem 5 noites com café / Transfer aeroporto-hotel."
                    >
                      <Textarea
                        id="contract-included"
                        rows={3}
                        value={overrides.included ?? ''}
                        onChange={(e) => set('included', e.target.value)}
                        placeholder={'Aéreo ida e volta\nHospedagem 5 noites com café da manhã\nTransfer aeroporto/hotel'}
                      />
                    </Field>
                    <Field
                      label="Serviços não inclusos"
                      htmlFor="contract-not-included"
                      className="sm:col-span-2"
                      hint="Um item por linha. Ex.: Refeições não citadas / Passeios opcionais / Taxas de turismo local."
                    >
                      <Textarea
                        id="contract-not-included"
                        rows={3}
                        value={overrides.not_included ?? ''}
                        onChange={(e) => set('not_included', e.target.value)}
                        placeholder={'Refeições não mencionadas\nPasseios opcionais\nTaxas cobradas no destino'}
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  title="Financeiro"
                  description="Valores em reais. O total do contrato é calculado a partir dos serviços da venda."
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Descontos" htmlFor="contract-discounts">
                      <CurrencyInput
                        id="contract-discounts"
                        value={overrides.discounts ?? null}
                        onValueChange={setMoney('discounts')}
                      />
                    </Field>
                    <Field label="Taxas" htmlFor="contract-taxes">
                      <CurrencyInput
                        id="contract-taxes"
                        value={overrides.taxes ?? null}
                        onValueChange={setMoney('taxes')}
                      />
                    </Field>
                    <Field label="Taxa de serviço" htmlFor="contract-service-fee">
                      <CurrencyInput
                        id="contract-service-fee"
                        value={overrides.service_fee ?? null}
                        onValueChange={setMoney('service_fee')}
                      />
                    </Field>
                    <Field label="Entrada" htmlFor="contract-down-payment">
                      <CurrencyInput
                        id="contract-down-payment"
                        value={overrides.down_payment ?? null}
                        onValueChange={setMoney('down_payment')}
                      />
                    </Field>
                    <Field
                      label="Pago diretamente ao fornecedor"
                      htmlFor="contract-paid-supplier"
                      hint="Valor que o cliente pagou direto ao fornecedor."
                    >
                      <CurrencyInput
                        id="contract-paid-supplier"
                        value={overrides.paid_to_supplier ?? null}
                        onValueChange={setMoney('paid_to_supplier')}
                      />
                    </Field>
                    <Field label="Parcelas" htmlFor="contract-installments" hint="Número inteiro de parcelas.">
                      <Input
                        id="contract-installments"
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={overrides.installments_count ?? ''}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          set('installments_count', Number.isFinite(n) && n > 0 ? n : null);
                        }}
                        placeholder="Ex.: 10"
                      />
                    </Field>
                    <Field label="Forma de pagamento" htmlFor="contract-payment-method" className="sm:col-span-3">
                      <Input
                        id="contract-payment-method"
                        value={overrides.payment_method ?? ''}
                        onChange={(e) => set('payment_method', e.target.value)}
                        placeholder="Ex.: PIX na entrada + 9x no cartão de crédito"
                      />
                    </Field>
                    <Field
                      label="Vencimentos e observações financeiras"
                      htmlFor="contract-financial-notes"
                      className="sm:col-span-3"
                      hint="Ex.: entrada em 10/08 e demais parcelas todo dia 10."
                    >
                      <Textarea
                        id="contract-financial-notes"
                        rows={2}
                        value={overrides.financial_notes ?? ''}
                        onChange={(e) => set('financial_notes', e.target.value)}
                        placeholder="Ex.: Entrada em 10/08/2026; parcelas mensais todo dia 10."
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  title="Seguro viagem"
                  description="Registre no contrato se o seguro foi contratado ou recusado pelo cliente."
                >
                  <RadioGroup
                    value={insuranceMode}
                    onValueChange={(v) => {
                      setOverrides((prev) => ({
                        ...prev,
                        insurance_contracted: v === 'contratado',
                        insurance_refusal_ack: v === 'recusado',
                      }));
                    }}
                    className="gap-2"
                  >
                    <label className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-sm cursor-pointer hover:bg-muted/40">
                      <RadioGroupItem value="contratado" id="ins-contratado" />
                      <span>Seguro viagem contratado</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-sm cursor-pointer hover:bg-muted/40">
                      <RadioGroupItem value="recusado" id="ins-recusado" />
                      <span>O cliente foi informado e recusou o seguro viagem</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-sm cursor-pointer hover:bg-muted/40">
                      <RadioGroupItem value="nao_informado" id="ins-nao-informado" />
                      <span>Não informado</span>
                    </label>
                  </RadioGroup>

                  {insuranceMode === 'recusado' && (
                    <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
                      A recusa do seguro viagem será registrada expressamente no contrato gerado.
                    </p>
                  )}

                  {insuranceMode === 'contratado' && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label="Seguradora" htmlFor="ins-insurer">
                        <Input
                          id="ins-insurer"
                          placeholder="Ex.: Assist Card"
                          value={overrides.insurance_insurer ?? ''}
                          onChange={(e) => set('insurance_insurer', e.target.value)}
                        />
                      </Field>
                      <Field label="Plano" htmlFor="ins-plan">
                        <Input
                          id="ins-plan"
                          placeholder="Ex.: AC 60 Europa"
                          value={overrides.insurance_plan ?? ''}
                          onChange={(e) => set('insurance_plan', e.target.value)}
                        />
                      </Field>
                      <Field label="Vigência" htmlFor="ins-validity">
                        <Input
                          id="ins-validity"
                          placeholder="Ex.: 10/09/2026 a 22/09/2026"
                          value={overrides.insurance_validity ?? ''}
                          onChange={(e) => set('insurance_validity', e.target.value)}
                        />
                      </Field>
                      <Field label="Coberturas" htmlFor="ins-coverage">
                        <Input
                          id="ins-coverage"
                          placeholder="Ex.: Despesas médicas USD 60.000 + bagagem"
                          value={overrides.insurance_coverage ?? ''}
                          onChange={(e) => set('insurance_coverage', e.target.value)}
                        />
                      </Field>
                    </div>
                  )}
                </FormSection>

                <FormSection
                  title="Condições e documentos"
                  description="Textos complementares que entram no contrato, sem alterar as cláusulas jurídicas do modelo."
                >
                  <div className="grid gap-4">
                    <Field
                      label="Multas e regras de cancelamento"
                      htmlFor="cond-penalties"
                      hint="Prazos e percentuais de multa aplicáveis em caso de cancelamento ou alteração."
                    >
                      <Textarea
                        id="cond-penalties"
                        rows={2}
                        value={overrides.conditions_penalties ?? ''}
                        onChange={(e) => set('conditions_penalties', e.target.value)}
                        placeholder="Ex.: Cancelamento até 30 dias antes: multa de 20% sobre o valor total."
                      />
                    </Field>
                    <Field
                      label="Documentação, vistos e exigências sanitárias"
                      htmlFor="cond-documentation"
                      hint="Documentos exigidos no embarque e no destino."
                    >
                      <Textarea
                        id="cond-documentation"
                        rows={2}
                        value={overrides.conditions_documentation ?? ''}
                        onChange={(e) => set('conditions_documentation', e.target.value)}
                        placeholder="Ex.: Passaporte com validade mínima de 6 meses e visto de turismo válido."
                      />
                    </Field>
                    <Field
                      label="Observações gerais"
                      htmlFor="cond-general"
                      hint="Combinados específicos desta viagem que não estão nas cláusulas do modelo."
                    >
                      <Textarea
                        id="cond-general"
                        rows={2}
                        value={overrides.conditions_general ?? ''}
                        onChange={(e) => set('conditions_general', e.target.value)}
                        placeholder="Ex.: Quarto com vista para o mar sujeito a disponibilidade no check-in."
                      />
                    </Field>
                    <Field
                      label="Documentos anexos ao contrato"
                      htmlFor="cond-attachments"
                      hint="Lista descritiva — não é upload de arquivos. Informe um documento por linha. Ex.: Voucher do hotel, bilhetes aéreos, apólice do seguro."
                    >
                      <Textarea
                        id="cond-attachments"
                        rows={3}
                        value={overrides.attachments ?? ''}
                        onChange={(e) => set('attachments', e.target.value)}
                        placeholder={'Voucher do hotel\nBilhetes aéreos\nApólice do seguro viagem'}
                      />
                    </Field>
                  </div>
                </FormSection>
              </TabsContent>

              <TabsContent value="revisao" className="space-y-4 mt-4">
                {blocking.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Pendências obrigatórias</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {blocking.map((i) => (
                          <li key={i.field}>
                            {i.message}
                            {i.field === 'client_document' && (
                              <Button
                                variant="link"
                                className="h-auto p-0 pl-1 text-xs underline"
                                onClick={goToDocument}
                              >
                                Ir para o campo
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Recomendações</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {warnings.map((i) => (
                          <li key={i.field}>{i.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {payload && (
                  <Card>
                    <CardContent className="py-4 space-y-2 text-sm">
                      <p className="font-semibold">{payload.contract_title}</p>
                      <p className="text-muted-foreground text-xs">
                        {payload.contract_number} • versão {payload.revision}
                      </p>
                      <div className="grid gap-1 sm:grid-cols-2 pt-2">
                        <span>
                          <strong>Agência:</strong> {payload.agency.trade_name || '—'}
                        </span>
                        <span>
                          <strong>Contratante:</strong> {payload.client.name}
                        </span>
                        <span>
                          <strong>CPF / CNPJ:</strong>{' '}
                          {payload.client.document ? maskDocument(payload.client.document) : '—'}
                        </span>
                        <span>
                          <strong>Destino:</strong> {payload.trip.destination}
                        </span>
                        <span>
                          <strong>Período:</strong> {formatDateBR(payload.trip.start_date)} a{' '}
                          {formatDateBR(payload.trip.end_date)}
                        </span>
                        <span>
                          <strong>Passageiros:</strong> {payload.passengers.length}
                        </span>
                        <span>
                          <strong>Serviços:</strong> {payload.services.length}
                        </span>
                        <span>
                          <strong>Descontos:</strong> {formatMoney(payload.financial.discounts)}
                        </span>
                        <span>
                          <strong>Taxas:</strong> {formatMoney(payload.financial.taxes)}
                        </span>
                        <span>
                          <strong>Taxa de serviço:</strong> {formatMoney(payload.financial.service_fee)}
                        </span>
                        <span>
                          <strong>Entrada:</strong> {formatMoney(payload.financial.down_payment)}
                        </span>
                        <span>
                          <strong>Total:</strong> {formatMoney(payload.financial.total)}
                        </span>
                        <span>
                          <strong>Pago:</strong> {formatMoney(payload.financial.paid)}
                        </span>
                        <span>
                          <strong>Seguro:</strong>{' '}
                          {payload.insurance.contracted
                            ? 'Contratado'
                            : payload.insurance.refusal_acknowledged
                              ? 'Recusado pelo cliente'
                              : 'Não informado'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => payload && generateSaleContractPdf(payload)}
                    disabled={!payload}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" /> Pré-visualizar dados
                  </Button>
                  <Button onClick={handleGenerate} disabled={!payload || blocking.length > 0 || generating} className="gap-2">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {contracts.length ? 'Gerar nova versão' : 'Gerar contrato'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="versoes" className="space-y-3 mt-4">
                {contracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nenhum contrato gerado para esta venda ainda.
                  </p>
                ) : (
                  contracts.map((c) => (
                    <Card key={c.id}>
                      <CardContent className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{c.contract_number}</p>
                          <p className="text-xs text-muted-foreground">
                            Versão {c.revision} • {new Date(c.generated_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={c.status === 'superseded' ? 'secondary' : 'default'}>
                            {c.status === 'superseded' ? 'Substituído' : 'Vigente'}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => handleDownloadExisting(c.id, c.generated_payload_json)}
                          >
                            <Download className="h-3.5 w-3.5" /> PDF
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
