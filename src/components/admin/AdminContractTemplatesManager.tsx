import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PopupRichTextEditor } from '@/components/admin/PopupRichTextEditor';
import { FileSignature, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { AgencyContractTemplate } from '@/types/contracts';

interface AgencyOption {
  user_id: string;
  name: string | null;
  agency_name: string | null;
}

const emptyForm = {
  agency_id: '',
  name: 'Contrato padrão',
  description: '',
  status: 'draft' as AgencyContractTemplate['status'],
  contract_title: 'Contrato de Prestação de Serviços Turísticos',
  legal_body_html: '',
  logo_url: '',
  trade_name: '',
  legal_name: '',
  cnpj: '',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  cadastur: '',
  emission_city: '',
  representative_name: '',
  representative_role: '',
  show_passenger_signatures: true,
  show_witnesses: false,
  footer_note: '',
};

type FormState = typeof emptyForm;

export function AdminContractTemplatesManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-contract-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_contract_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as unknown as AgencyContractTemplate[];
    },
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['admin-contract-agencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, agency_name')
        .order('agency_name', { nullsFirst: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as AgencyOption[];
    },
  });

  const agencyLabel = useMemo(() => {
    const map = new Map<string, string>();
    agencies.forEach((a) => map.set(a.user_id, a.agency_name || a.name || a.user_id));
    return map;
  }, [agencies]);

  const filtered = templates.filter((t) => {
    const label = (agencyLabel.get(t.agency_id) || '').toLowerCase();
    return !search || label.includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase());
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (t: AgencyContractTemplate) => {
    setEditingId(t.id);
    setForm({
      agency_id: t.agency_id,
      name: t.name,
      description: t.description ?? '',
      status: t.status,
      contract_title: t.contract_title,
      legal_body_html: t.legal_body_html,
      logo_url: t.logo_url ?? '',
      trade_name: t.header_config?.trade_name ?? '',
      legal_name: t.header_config?.legal_name ?? '',
      cnpj: t.header_config?.cnpj ?? '',
      address: t.header_config?.address ?? '',
      phone: t.header_config?.phone ?? '',
      whatsapp: t.header_config?.whatsapp ?? '',
      email: t.header_config?.email ?? '',
      website: t.header_config?.website ?? '',
      cadastur: t.header_config?.cadastur ?? '',
      emission_city: t.header_config?.emission_city ?? '',
      representative_name: t.signature_config?.representative_name ?? '',
      representative_role: t.signature_config?.representative_role ?? '',
      show_passenger_signatures: t.signature_config?.show_passenger_signatures ?? true,
      show_witnesses: t.signature_config?.show_witnesses ?? false,
      footer_note: t.footer_config?.note ?? '',
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.agency_id) throw new Error('Selecione a agência.');
      if (!form.trade_name) throw new Error('Informe o nome da agência exibido no contrato.');

      const payload = {
        agency_id: form.agency_id,
        name: form.name,
        description: form.description || null,
        status: form.status,
        contract_title: form.contract_title,
        legal_body_html: form.legal_body_html,
        logo_url: form.logo_url || null,
        header_config: {
          trade_name: form.trade_name,
          legal_name: form.legal_name,
          cnpj: form.cnpj,
          address: form.address,
          phone: form.phone,
          whatsapp: form.whatsapp,
          email: form.email,
          website: form.website,
          cadastur: form.cadastur,
          emission_city: form.emission_city,
        },
        signature_config: {
          representative_name: form.representative_name,
          representative_role: form.representative_role,
          show_passenger_signatures: form.show_passenger_signatures,
          show_witnesses: form.show_witnesses,
        },
        footer_config: { note: form.footer_note, show_pagination: true },
      };

      if (editingId) {
        const { error } = await (supabase.from('agency_contract_templates') as any)
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const existing = templates.filter((t) => t.agency_id === form.agency_id);
        const version = existing.length ? Math.max(...existing.map((t) => t.version)) + 1 : 1;
        const { error } = await (supabase.from('agency_contract_templates') as any).insert({
          ...payload,
          version,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contract-templates'] });
      toast.success('Modelo de contrato salvo');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async (t: AgencyContractTemplate) => {
      const next = t.status === 'active' ? 'inactive' : 'active';
      if (next === 'active') {
        await (supabase.from('agency_contract_templates') as any)
          .update({ status: 'inactive' })
          .eq('agency_id', t.agency_id)
          .eq('status', 'active');
      }
      const { error } = await (supabase.from('agency_contract_templates') as any)
        .update({ status: next })
        .eq('id', t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contract-templates'] });
      toast.success('Situação atualizada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileSignature className="h-5 w-5" /> Contratos das Agências
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre o texto jurídico e os dados de cada agência. Somente o modelo ativo fica disponível na
            Gestão Financeira da agência.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo modelo
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar agência ou modelo" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum modelo de contrato cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-3">
                  <span className="truncate">{agencyLabel.get(t.agency_id) || t.agency_id}</span>
                  <Badge variant={t.status === 'active' ? 'default' : 'secondary'}>
                    {t.status === 'active' ? 'Ativo' : t.status === 'draft' ? 'Rascunho' : 'Inativo'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="text-muted-foreground">
                  {t.name} • versão {t.version} • atualizado em {new Date(t.updated_at).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleStatus.mutate(t)}>
                    {t.status === 'active' ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar modelo de contrato' : 'Novo modelo de contrato'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Agência *</Label>
                <Select value={form.agency_id} onValueChange={(v) => set('agency_id', v)} disabled={!!editingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a agência" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {agencies.map((a) => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {a.agency_name || a.name || a.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Situação</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v as FormState['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome interno do modelo</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <Label>Título exibido no contrato</Label>
                <Input value={form.contract_title} onChange={(e) => set('contract_title', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nome da agência no contrato *</Label>
                <Input value={form.trade_name} onChange={(e) => set('trade_name', e.target.value)} />
              </div>
              <div>
                <Label>Razão social</Label>
                <Input value={form.legal_name} onChange={(e) => set('legal_name', e.target.value)} />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
              </div>
              <div>
                <Label>Cadastur</Label>
                <Input value={form.cadastur} onChange={(e) => set('cadastur', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div>
                <Label>Site</Label>
                <Input value={form.website} onChange={(e) => set('website', e.target.value)} />
              </div>
              <div>
                <Label>Cidade de emissão padrão</Label>
                <Input value={form.emission_city} onChange={(e) => set('emission_city', e.target.value)} />
              </div>
              <div>
                <Label>URL do logotipo</Label>
                <Input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Texto jurídico / cláusulas *</Label>
              <PopupRichTextEditor content={form.legal_body_html} onChange={(html) => set('legal_body_html', html)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Representante que assina</Label>
                <Input value={form.representative_name} onChange={(e) => set('representative_name', e.target.value)} />
              </div>
              <div>
                <Label>Cargo do representante</Label>
                <Input value={form.representative_role} onChange={(e) => set('representative_role', e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.show_passenger_signatures}
                  onCheckedChange={(v) => set('show_passenger_signatures', !!v)}
                />
                Incluir assinatura de cada passageiro
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.show_witnesses} onCheckedChange={(v) => set('show_witnesses', !!v)} />
                Incluir campo de testemunhas
              </label>
              <div className="sm:col-span-2">
                <Label>Rodapé</Label>
                <Textarea rows={2} value={form.footer_note} onChange={(e) => set('footer_note', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Observações internas</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminContractTemplatesManager;