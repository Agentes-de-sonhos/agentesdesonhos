import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useTeamAdminMutation, useTeamMemberDetail } from '@/hooks/useTeamMembers'
import { CLIENTS_PERMISSIONS, FINANCIAL_PERMISSIONS, totalClientsAccess, totalFinancialAccess } from '@/lib/teamPermissions'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'create' | 'edit'
type ClientsLevel = 'none' | 'total' | 'custom'

interface StageRow { id: string; name: string; color?: string | null }

function useOwnerStages(ownerId?: string) {
  return useQuery({
    queryKey: ['team-form-stages', ownerId],
    enabled: !!ownerId,
    queryFn: async () => {
      const [opps, ops] = await Promise.all([
        supabase.from('pipeline_stages').select('id, name, color, position').eq('user_id', ownerId!).order('position'),
        supabase.from('operation_pipeline_stages' as any).select('id, name, color, position').eq('user_id', ownerId!).order('position') as any,
      ])
      return {
        opportunities: (opps.data ?? []) as StageRow[],
        operations: ((ops as any).data ?? []) as StageRow[],
      }
    },
    staleTime: 60_000,
  })
}

interface Props {
  mode: Mode
  memberId?: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function TeamMemberForm({ mode, memberId, open, onOpenChange }: Props) {
  const { user } = useAuth()
  const { data: stages } = useOwnerStages(user?.id)
  const { data: detail, isLoading: loadingDetail } = useTeamMemberDetail(mode === 'edit' ? memberId ?? null : null)
  const mutation = useTeamAdminMutation()

  const [fullName, setFullName] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [roleTitle, setRoleTitle] = useState('')

  const [clientsLevel, setClientsLevel] = useState<ClientsLevel>('none')
  const [permSet, setPermSet] = useState<Set<string>>(new Set())
  const [stagePerms, setStagePerms] = useState<Record<string, { view: boolean; edit: boolean; move: boolean }>>({})
  const [financialEnabled, setFinancialEnabled] = useState(false)

  // Carrega dados do membro em modo edição
  useEffect(() => {
    if (mode !== 'edit' || !detail) return
    setFullName(detail.full_name)
    setLogin(detail.login)
    setRoleTitle(detail.role_title ?? '')
    const clientsKeys = new Set(detail.permissions.filter(p => p.module_key === 'clients' && p.enabled).map(p => p.permission_key))
    setPermSet(clientsKeys)
    setClientsLevel(clientsKeys.size === 0 ? 'none'
      : clientsKeys.size >= CLIENTS_PERMISSIONS.length ? 'total' : 'custom')
    setFinancialEnabled(detail.permissions.some(p => p.permission_key === 'financial.access' && p.enabled))
    const sp: Record<string, { view: boolean; edit: boolean; move: boolean }> = {}
    detail.stage_permissions.forEach(s => {
      sp[`${s.pipeline_type}:${s.stage_id}`] = { view: s.can_view, edit: s.can_edit, move: s.can_move }
    })
    setStagePerms(sp)
  }, [mode, detail])

  const togglePerm = (key: string, on: boolean) => {
    const next = new Set(permSet)
    on ? next.add(key) : next.delete(key)
    setPermSet(next)
  }

  const setStage = (pipeline: 'opportunities' | 'operations', stageId: string, patch: Partial<{ view: boolean; edit: boolean; move: boolean }>) => {
    const k = `${pipeline}:${stageId}`
    const cur = stagePerms[k] ?? { view: false, edit: false, move: false }
    setStagePerms({ ...stagePerms, [k]: { ...cur, ...patch } })
  }

  const buildPayload = () => {
    const permissions: { module_key: string; permission_key: string; enabled: boolean }[] = []
    if (clientsLevel === 'total') {
      permissions.push(...totalClientsAccess())
    } else if (clientsLevel === 'custom') {
      CLIENTS_PERMISSIONS.forEach(p => {
        if (permSet.has(p.key)) permissions.push({ module_key: 'clients', permission_key: p.key, enabled: true })
      })
    }
    if (financialEnabled) permissions.push(...totalFinancialAccess())

    const stage_permissions: any[] = []
    Object.entries(stagePerms).forEach(([k, v]) => {
      if (!v.view && !v.edit && !v.move) return
      const [pipeline_type, stage_id] = k.split(':')
      stage_permissions.push({ pipeline_type, stage_id, can_view: v.view, can_edit: v.edit, can_move: v.move })
    })
    return { permissions, stage_permissions }
  }

  const submit = () => {
    if (!fullName.trim()) return toast.error('Informe o nome completo')
    if (!login.trim()) return toast.error('Informe o login')
    if (mode === 'create') {
      if (password.length < 6) return toast.error('Senha precisa ter ao menos 6 caracteres')
      if (password !== password2) return toast.error('Senhas não conferem')
    } else if (password && password !== password2) {
      return toast.error('Senhas não conferem')
    }

    const payload: Record<string, any> = {
      action: mode === 'create' ? 'create' : 'update',
      full_name: fullName.trim(),
      role_title: roleTitle.trim() || null,
      ...buildPayload(),
    }
    if (mode === 'create') {
      payload.login = login.trim()
      payload.password = password
    } else {
      payload.id = memberId
      if (password) payload.password = password
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(mode === 'create' ? 'Usuário criado' : 'Usuário atualizado')
        onOpenChange(false)
      },
      onError: (e: any) => toast.error(e.message),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo usuário da equipe' : 'Editar usuário'}</DialogTitle>
          <DialogDescription>
            Defina as credenciais e permissões deste colaborador. Você poderá ajustar a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        {loadingDetail && mode === 'edit' ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {/* Dados básicos */}
            <section className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Nome completo *</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Cargo / Função</Label>
                <Input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="Ex: Atendimento" />
              </div>
              <div>
                <Label>Login (e-mail ou usuário) *</Label>
                <Input value={login} onChange={e => setLogin(e.target.value)} disabled={mode === 'edit'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{mode === 'create' ? 'Senha *' : 'Nova senha'}</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div>
                  <Label>Confirmar</Label>
                  <Input type="password" value={password2} onChange={e => setPassword2(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Gestão de Clientes */}
            <section className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Gestão de Clientes</h3>
              </div>
              <RadioGroup value={clientsLevel} onValueChange={(v) => setClientsLevel(v as ClientsLevel)} className="grid grid-cols-3 gap-2">
                {(['none', 'total', 'custom'] as ClientsLevel[]).map(l => (
                  <label key={l} className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value={l} id={`cl-${l}`} />
                    <span className="text-sm">{l === 'none' ? 'Sem acesso' : l === 'total' ? 'Acesso total' : 'Personalizado'}</span>
                  </label>
                ))}
              </RadioGroup>

              {clientsLevel === 'custom' && (
                <div className="grid gap-2 md:grid-cols-2">
                  {CLIENTS_PERMISSIONS.map(p => (
                    <label key={p.key} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={permSet.has(p.key)} onCheckedChange={(v) => togglePerm(p.key, !!v)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              )}

              {clientsLevel !== 'none' && (
                <div className="space-y-4 border-t pt-4">
                  <StageList title="Etapas permitidas em Oportunidades" pipeline="opportunities"
                    stages={stages?.opportunities ?? []} stagePerms={stagePerms} setStage={setStage} />
                  <StageList title="Etapas permitidas em Operações" pipeline="operations"
                    stages={stages?.operations ?? []} stagePerms={stagePerms} setStage={setStage} />
                </div>
              )}
            </section>

            {/* Financeiro */}
            <section className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-semibold">Gestão Financeira</h3>
                <p className="text-xs text-muted-foreground">Acesso total ao módulo financeiro.</p>
              </div>
              <Switch checked={financialEnabled} onCheckedChange={setFinancialEnabled} />
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Criar usuário' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StageList({
  title, pipeline, stages, stagePerms, setStage,
}: {
  title: string
  pipeline: 'opportunities' | 'operations'
  stages: StageRow[]
  stagePerms: Record<string, { view: boolean; edit: boolean; move: boolean }>
  setStage: (p: 'opportunities' | 'operations', id: string, patch: any) => void
}) {
  if (!stages.length) {
    return (
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-xs text-muted-foreground">Nenhuma etapa configurada.</p>
      </div>
    )
  }
  return (
    <div>
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="mb-2 text-xs text-muted-foreground">Marque as etapas que este usuário poderá ver. Você pode liberar edição ou movimentação separadamente.</p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 text-left">Etapa</th>
              <th className="px-3 py-1.5">Visualizar</th>
              <th className="px-3 py-1.5">Editar</th>
              <th className="px-3 py-1.5">Mover</th>
            </tr>
          </thead>
          <tbody>
            {stages.map(s => {
              const k = `${pipeline}:${s.id}`
              const v = stagePerms[k] ?? { view: false, edit: false, move: false }
              return (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-1.5">{s.name}</td>
                  <td className="px-3 py-1.5 text-center">
                    <Checkbox checked={v.view} onCheckedChange={(c) => setStage(pipeline, s.id, { view: !!c })} />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Checkbox checked={v.edit} onCheckedChange={(c) => setStage(pipeline, s.id, { edit: !!c })} />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Checkbox checked={v.move} onCheckedChange={(c) => setStage(pipeline, s.id, { move: !!c })} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}