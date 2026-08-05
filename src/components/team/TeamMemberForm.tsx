import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useQuery } from '@tanstack/react-query'
import {
  useTeamAdminMutation, useTeamMemberDetail, useTeamMemberScopes, useAccessProfiles,
} from '@/hooks/useTeamMembers'
import { keysToPermissionRows, type DataScope } from '@/lib/teamPermissions'
import { PermissionMatrix } from './PermissionMatrix'
import { ScopeSelector } from './ScopeSelector'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

type Mode = 'create' | 'edit'

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
  const { data: savedScopes } = useTeamMemberScopes(mode === 'edit' ? memberId ?? null : null)
  const { data: profiles = [] } = useAccessProfiles()
  const mutation = useTeamAdminMutation()

  const [fullName, setFullName] = useState('')
  const [login, setLogin] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [teamName, setTeamName] = useState('')
  const [notificationEmail, setNotificationEmail] = useState('')
  const [profileId, setProfileId] = useState<string>('')

  const [permSet, setPermSet] = useState<Set<string>>(new Set())
  const [scopes, setScopes] = useState<Record<string, DataScope>>({})
  const [stagePerms, setStagePerms] = useState<Record<string, { view: boolean; edit: boolean; move: boolean }>>({})

  const selectableProfiles = useMemo(
    () => profiles.filter(p => p.key !== 'owner'),
    [profiles],
  )

  // Reseta ao abrir em modo criação
  useEffect(() => {
    if (!open || mode !== 'create') return
    setFullName(''); setLogin(''); setEmail(''); setPhone('')
    setPassword(''); setPassword2(''); setRoleTitle(''); setDepartment(''); setTeamName('')
    setNotificationEmail(''); setProfileId(''); setPermSet(new Set()); setScopes({}); setStagePerms({})
  }, [open, mode])

  // Carrega dados do membro em modo edição
  useEffect(() => {
    if (mode !== 'edit' || !detail) return
    const d = detail as any
    setFullName(detail.full_name)
    setLogin(detail.login)
    setRoleTitle(detail.role_title ?? '')
    setEmail(d.email ?? '')
    setPhone(d.phone ?? '')
    setDepartment(d.department ?? '')
    setTeamName(d.team_name ?? '')
    setNotificationEmail(d.notification_email ?? '')
    setProfileId(d.access_profile_id ?? '')
    setPermSet(new Set(detail.permissions.filter(p => p.enabled).map(p => p.permission_key)))
    const sp: Record<string, { view: boolean; edit: boolean; move: boolean }> = {}
    detail.stage_permissions.forEach(s => {
      sp[`${s.pipeline_type}:${s.stage_id}`] = { view: s.can_view, edit: s.can_edit, move: s.can_move }
    })
    setStagePerms(sp)
  }, [mode, detail])

  useEffect(() => {
    if (savedScopes) setScopes(savedScopes)
  }, [savedScopes])

  const applyProfile = (id: string) => {
    setProfileId(id)
    const p = selectableProfiles.find(x => x.id === id)
    if (!p) return
    setPermSet(new Set(p.permission_keys ?? []))
    setScopes({ ...(p.scopes ?? {}) } as Record<string, DataScope>)
    toast.success(`Perfil "${p.name}" aplicado. Você ainda pode ajustar item por item.`)
  }

  const setStage = (pipeline: 'opportunities' | 'operations', stageId: string, patch: Partial<{ view: boolean; edit: boolean; move: boolean }>) => {
    const k = `${pipeline}:${stageId}`
    const cur = stagePerms[k] ?? { view: false, edit: false, move: false }
    setStagePerms({ ...stagePerms, [k]: { ...cur, ...patch } })
  }

  const buildPayload = () => {
    const stage_permissions: any[] = []
    Object.entries(stagePerms).forEach(([k, v]) => {
      if (!v.view && !v.edit && !v.move) return
      const [pipeline_type, stage_id] = k.split(':')
      stage_permissions.push({ pipeline_type, stage_id, can_view: v.view, can_edit: v.edit, can_move: v.move })
    })
    return {
      full_name: fullName.trim(),
      role_title: roleTitle.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      department: department.trim() || null,
      team_name: teamName.trim() || null,
      notification_email: notificationEmail.trim() || null,
      access_profile_id: profileId || null,
      permission_keys: Array.from(permSet),
      permissions: keysToPermissionRows(permSet),
      scopes,
      stage_permissions,
    }
  }

  const submit = () => {
    if (!fullName.trim()) return toast.error('Informe o nome completo')
    if (!login.trim()) return toast.error('Informe o login')
    if (mode === 'create') {
      if (password.length < 6) return toast.error('A senha precisa ter ao menos 6 caracteres')
      if (password !== password2) return toast.error('As senhas não coincidem')
    } else if (password && password !== password2) {
      return toast.error('As senhas não coincidem')
    }
    if (!permSet.size) return toast.error('Selecione ao menos uma permissão ou aplique um perfil de acesso')

    const payload = mode === 'create'
      ? { action: 'create', login: login.trim(), password, ...buildPayload() }
      : { action: 'update', id: memberId, ...(password ? { password } : {}), ...buildPayload() }

    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(mode === 'create' ? 'Colaborador criado' : 'Alterações salvas')
        onOpenChange(false)
      },
      onError: (e: any) => toast.error(e.message),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo colaborador' : 'Editar colaborador'}</DialogTitle>
          <DialogDescription>
            Defina identificação, perfil de acesso, permissões e o alcance dos dados. Você poderá ajustar a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        {loadingDetail && mode === 'edit' ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="dados">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="permissoes">Permissões</TabsTrigger>
              <TabsTrigger value="dados-visiveis">Dados visíveis</TabsTrigger>
              <TabsTrigger value="etapas">Etapas</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 pt-4">
              <section className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Nome completo *</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label>Cargo / Função</Label>
                  <Input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="Ex: Consultora de viagens" />
                </div>
                <div>
                  <Label>Login (e-mail ou usuário) *</Label>
                  <Input value={login} onChange={e => setLogin(e.target.value)} disabled={mode === 'edit'} />
                </div>
                <div>
                  <Label>E-mail de contato</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Telefone / WhatsApp</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 90000-0000" />
                </div>
                <div>
                  <Label>E-mail para notificações</Label>
                  <Input type="email" value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)}
                    placeholder="usado para avisos de novos leads" />
                </div>
                <div>
                  <Label>Departamento</Label>
                  <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Ex: Comercial" />
                </div>
                <div>
                  <Label>Equipe</Label>
                  <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Ex: Time Corporativo" />
                </div>
                <div>
                  <Label>{mode === 'create' ? 'Senha *' : 'Nova senha'}</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                </div>
                <div>
                  <Label>Confirmar senha</Label>
                  <Input type="password" value={password2} onChange={e => setPassword2(e.target.value)} autoComplete="new-password" />
                </div>
              </section>

              <section className="space-y-2 rounded-lg border p-4">
                <Label>Perfil de acesso</Label>
                <p className="text-xs text-muted-foreground">
                  Aplique um perfil pronto para preencher automaticamente permissões e alcance dos dados.
                </p>
                <Select value={profileId} onValueChange={applyProfile}>
                  <SelectTrigger><SelectValue placeholder="Selecionar perfil (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {selectableProfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.is_native ? '' : ' (personalizado)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="secondary">{permSet.size} permissões selecionadas</Badge>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="permissoes" className="pt-4">
              <PermissionMatrix value={permSet} onChange={setPermSet} />
            </TabsContent>

            <TabsContent value="dados-visiveis" className="pt-4">
              <ScopeSelector value={scopes} onChange={setScopes} />
            </TabsContent>

            <TabsContent value="etapas" className="space-y-4 pt-4">
              <StageList title="Etapas permitidas em Oportunidades" pipeline="opportunities"
                stages={stages?.opportunities ?? []} stagePerms={stagePerms} setStage={setStage} />
              <StageList title="Etapas permitidas em Operações" pipeline="operations"
                stages={stages?.operations ?? []} stagePerms={stagePerms} setStage={setStage} />
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Criar colaborador' : 'Salvar alterações'}
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
      <p className="mb-2 text-xs text-muted-foreground">Marque as etapas que este colaborador poderá ver. Você pode liberar edição ou movimentação separadamente.</p>
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
