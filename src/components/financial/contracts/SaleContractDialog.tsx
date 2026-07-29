import { useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Download, FileText, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Sale } from '@/types/financial';
import type { ContractPayload } from '@/types/contracts';
import { useAgencyContractTemplate, useSaleContracts } from '@/hooks/useSaleContracts';
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

interface Props {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleContractDialog({ sale, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const supportWhatsApp = useSupportWhatsApp();
  const [overrides, setOverrides] = useState<ContractDraftOverrides>({});
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState('dados');

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

      let travelers: Record<string, unknown>[] = [];
      if (sale!.client_id) {
        const { data } = await supabase.from('travelers').select('*').eq('client_id', sale!.client_id);
        travelers = data ?? [];
      }

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
        } | null,
        travelers: travelers as never[],
      };
    },
  });

  const nextRevision = (contracts[0]?.revision ?? 0) + 1;

  const payload: ContractPayload | null = useMemo(() => {
    if (!sale || !saleData) return null;
    return buildContractPayload({
      sale,
      products: saleData.products,
      payments: saleData.payments,
      client: saleData.client,
      travelers: saleData.travelers,
      agencyProfile: saleData.profile,
      operatorNames: saleData.operatorNames,
      template: templateData?.template ?? null,
      sections: templateData?.sections ?? [],
      overrides,
      contractNumber: buildContractNumber(sale.id, nextRevision),
      revision: nextRevision,
    });
  }, [sale, saleData, templateData, overrides, nextRevision]);

  const issues = useMemo(() => (payload ? validateContractPayload(payload) : []), [payload]);
  const blocking = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  const set = <K extends keyof ContractDraftOverrides>(key: K, value: ContractDraftOverrides[K]) =>
    setOverrides((prev) => ({ ...prev, [key]: value }));

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
      <DialogContent className="max-w-4xl h-[90dvh] max-h-[90dvh] overflow-hidden flex flex-col gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
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
            <TabsList className="w-full justify-start shrink-0">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="revisao">Revisão</TabsTrigger>
              <TabsTrigger value="versoes">Versões ({contracts.length})</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-3 pb-4">
              <TabsContent value="dados" className="space-y-6 mt-4">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Contratante</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>CPF / CNPJ *</Label>
                      <Input
                        value={overrides.client_document ?? ''}
                        onChange={(e) => set('client_document', e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div>
                      <Label>Endereço completo</Label>
                      <Input
                        value={overrides.client_address ?? ''}
                        onChange={(e) => set('client_address', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Nacionalidade</Label>
                      <Input
                        value={overrides.client_nationality ?? ''}
                        onChange={(e) => set('client_nationality', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Responsável financeiro (se diferente)</Label>
                      <Input
                        value={overrides.financial_responsible ?? ''}
                        onChange={(e) => set('financial_responsible', e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Passageiros</h3>
                  {saleData?.travelers?.length ? (
                    <div className="space-y-2">
                      {(saleData.travelers as { id: string; nome_completo: string; cpf: string | null }[]).map((t) => {
                        const selectedIds = overrides.passenger_ids ?? (saleData.travelers as { id: string }[]).map((x) => x.id);
                        const checked = selectedIds.includes(t.id);
                        return (
                          <label key={t.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = v
                                  ? [...selectedIds, t.id]
                                  : selectedIds.filter((id) => id !== t.id);
                                set('passenger_ids', next);
                              }}
                            />
                            <span className="font-medium">{t.nome_completo}</span>
                            <span className="text-muted-foreground text-xs">{t.cpf || 'sem CPF'}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum passageiro cadastrado para este cliente. Cadastre os viajantes na ficha do cliente
                      para incluí-los no contrato.
                    </p>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Viagem</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Origem</Label>
                      <Input value={overrides.trip_origin ?? ''} onChange={(e) => set('trip_origin', e.target.value)} />
                    </div>
                    <div>
                      <Label>Cidade de emissão</Label>
                      <Input
                        value={overrides.emission_city ?? ''}
                        onChange={(e) => set('emission_city', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Serviços inclusos (um por linha)</Label>
                      <Textarea rows={3} value={overrides.included ?? ''} onChange={(e) => set('included', e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Não inclusos (um por linha)</Label>
                      <Textarea
                        rows={3}
                        value={overrides.not_included ?? ''}
                        onChange={(e) => set('not_included', e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Financeiro</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label>Descontos</Label>
                      <Input
                        type="number"
                        value={overrides.discounts ?? ''}
                        onChange={(e) => set('discounts', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Taxas</Label>
                      <Input type="number" value={overrides.taxes ?? ''} onChange={(e) => set('taxes', Number(e.target.value))} />
                    </div>
                    <div>
                      <Label>Taxa de serviço</Label>
                      <Input
                        type="number"
                        value={overrides.service_fee ?? ''}
                        onChange={(e) => set('service_fee', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Entrada</Label>
                      <Input
                        type="number"
                        value={overrides.down_payment ?? ''}
                        onChange={(e) => set('down_payment', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Pago diretamente ao fornecedor</Label>
                      <Input
                        type="number"
                        value={overrides.paid_to_supplier ?? ''}
                        onChange={(e) => set('paid_to_supplier', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Parcelas</Label>
                      <Input
                        type="number"
                        value={overrides.installments_count ?? ''}
                        onChange={(e) => set('installments_count', Number(e.target.value) || null)}
                      />
                    </div>
                    <div>
                      <Label>Forma de pagamento</Label>
                      <Input
                        value={overrides.payment_method ?? ''}
                        onChange={(e) => set('payment_method', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label>Vencimentos / observações financeiras</Label>
                      <Textarea
                        rows={2}
                        value={overrides.financial_notes ?? ''}
                        onChange={(e) => set('financial_notes', e.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Seguro viagem</h3>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!overrides.insurance_contracted}
                      onCheckedChange={(v) => set('insurance_contracted', !!v)}
                    />
                    Seguro viagem contratado
                  </label>
                  {overrides.insurance_contracted ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Seguradora"
                        value={overrides.insurance_insurer ?? ''}
                        onChange={(e) => set('insurance_insurer', e.target.value)}
                      />
                      <Input
                        placeholder="Plano"
                        value={overrides.insurance_plan ?? ''}
                        onChange={(e) => set('insurance_plan', e.target.value)}
                      />
                      <Input
                        placeholder="Vigência"
                        value={overrides.insurance_validity ?? ''}
                        onChange={(e) => set('insurance_validity', e.target.value)}
                      />
                      <Input
                        placeholder="Coberturas"
                        value={overrides.insurance_coverage ?? ''}
                        onChange={(e) => set('insurance_coverage', e.target.value)}
                      />
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!overrides.insurance_refusal_ack}
                        onCheckedChange={(v) => set('insurance_refusal_ack', !!v)}
                      />
                      O cliente foi informado e recusou o seguro viagem
                    </label>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Condições e anexos</h3>
                  <div className="grid gap-3">
                    <Textarea
                      rows={2}
                      placeholder="Multas e regras de cancelamento"
                      value={overrides.conditions_penalties ?? ''}
                      onChange={(e) => set('conditions_penalties', e.target.value)}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Documentação, vistos e exigências sanitárias"
                      value={overrides.conditions_documentation ?? ''}
                      onChange={(e) => set('conditions_documentation', e.target.value)}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Observações gerais"
                      value={overrides.conditions_general ?? ''}
                      onChange={(e) => set('conditions_general', e.target.value)}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Anexos (um por linha)"
                      value={overrides.attachments ?? ''}
                      onChange={(e) => set('attachments', e.target.value)}
                    />
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="revisao" className="space-y-4 mt-4">
                {blocking.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Pendências obrigatórias</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {blocking.map((i) => (
                          <li key={i.field}>{i.message}</li>
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
                          <strong>Total:</strong> {formatMoney(payload.financial.total)}
                        </span>
                        <span>
                          <strong>Pago:</strong> {formatMoney(payload.financial.paid)}
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