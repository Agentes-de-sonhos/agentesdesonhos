import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { maskDocument, validateDocument } from '@/lib/documentMask';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName?: string;
  /** Chamado com o id do viajante criado, para seleção automática. */
  onCreated: (travelerId: string) => void | Promise<void>;
}

const EMPTY = {
  nome_completo: '',
  data_nascimento: '',
  cpf: '',
  passaporte: '',
  validade_passaporte: '',
  nacionalidade: '',
  observacoes: '',
  is_responsavel: false,
};

/**
 * Cadastro rápido de viajante sem sair do contrato.
 * Usa a mesma tabela oficial (`travelers`), os mesmos campos da ficha do cliente
 * e a validação de CPF/CNPJ já existente na plataforma.
 */
export function QuickTravelerDialog({ open, onOpenChange, clientId, clientName, onCreated }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [docTouched, setDocTouched] = useState(false);

  const docState = validateDocument(form.cpf);
  const docError = docTouched && !docState.isEmpty ? docState.error : null;

  const setField = (key: keyof typeof EMPTY, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setForm({ ...EMPTY });
    setDocTouched(false);
  };

  const save = async (keepOpen: boolean) => {
    if (!form.nome_completo.trim()) return;
    if (!docState.isEmpty && !docState.isValid) {
      setDocTouched(true);
      return;
    }
    if (!user?.id) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('travelers')
        .insert({
          client_id: clientId,
          user_id: user.id,
          nome_completo: form.nome_completo.trim(),
          data_nascimento: form.data_nascimento || null,
          cpf: docState.isEmpty ? null : docState.masked,
          passaporte: form.passaporte.trim() || null,
          validade_passaporte: form.validade_passaporte || null,
          nacionalidade: form.nacionalidade.trim() || null,
          observacoes: form.observacoes.trim() || null,
          is_responsavel: form.is_responsavel,
        })
        .select('id')
        .single();
      if (error) throw error;
      toast.success('Passageiro cadastrado e selecionado no contrato.');
      await onCreated(data.id as string);
      reset();
      if (!keepOpen) onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao cadastrar passageiro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo passageiro</DialogTitle>
          <DialogDescription>
            Será salvo na ficha {clientName ? `de ${clientName}` : 'do cliente'} e ficará disponível em
            todos os contratos e roteiros.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="qt-name" className="text-xs font-medium">
              Nome completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qt-name"
              value={form.nome_completo}
              onChange={(e) => setField('nome_completo', e.target.value)}
              placeholder="Ex.: Maria Aparecida Souza"
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qt-birth" className="text-xs font-medium">Data de nascimento</Label>
              <Input
                id="qt-birth"
                type="date"
                value={form.data_nascimento}
                onChange={(e) => setField('data_nascimento', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Define adulto, criança ou bebê no contrato.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qt-nat" className="text-xs font-medium">Nacionalidade</Label>
              <Input
                id="qt-nat"
                value={form.nacionalidade}
                onChange={(e) => setField('nacionalidade', e.target.value)}
                placeholder="Ex.: Brasileira"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qt-doc" className="text-xs font-medium">CPF / CNPJ</Label>
              <Input
                id="qt-doc"
                inputMode="numeric"
                value={maskDocument(form.cpf)}
                onChange={(e) => setField('cpf', e.target.value)}
                onBlur={() => setDocTouched(true)}
                placeholder="000.000.000-00"
                aria-invalid={!!docError}
                className={docError ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
              {docError && <p className="text-xs font-medium text-destructive">{docError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qt-passport" className="text-xs font-medium">Passaporte</Label>
              <Input
                id="qt-passport"
                value={form.passaporte}
                onChange={(e) => setField('passaporte', e.target.value)}
                placeholder="Ex.: FX123456"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qt-passport-validity" className="text-xs font-medium">Validade do passaporte</Label>
            <Input
              id="qt-passport-validity"
              type="date"
              value={form.validade_passaporte}
              onChange={(e) => setField('validade_passaporte', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qt-notes" className="text-xs font-medium">Observações</Label>
            <Textarea
              id="qt-notes"
              rows={2}
              value={form.observacoes}
              onChange={(e) => setField('observacoes', e.target.value)}
              placeholder="Ex.: cadeirante, alergia alimentar, assento preferencial."
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_responsavel}
              onCheckedChange={(v) => setField('is_responsavel', v)}
              id="qt-resp"
            />
            <Label htmlFor="qt-resp" className="text-xs font-medium">Responsável principal</Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={() => save(true)}
            disabled={saving || !form.nome_completo.trim()}
          >
            Salvar e adicionar outro
          </Button>
          <Button onClick={() => save(false)} disabled={saving || !form.nome_completo.trim()}>
            {saving ? 'Salvando...' : 'Salvar passageiro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
