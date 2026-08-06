import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Building2, Users, MailWarning, ShieldCheck, Search, Loader2, Settings2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useAdminAgencyDetail, useAdminAgencyLimitOverride, useAdminAgencyList,
  useAdminAgencyTeamsStats, type AdminAgencyRow,
} from '@/hooks/useAdminAgencyTeams'
import { TeamScopeProvider } from '@/components/team/TeamScopeContext'
import { TeamManagementCenter } from '@/components/team/TeamManagementCenter'

const PLAN_OPTIONS = [
  'all', 'start', 'essencial', 'profissional', 'premium',
  'fundador', 'educa_pass', 'cartao_digital', 'fornecedor_parceiro',
]

function Kpi({ icon: Icon, label, value, hint }: {
  icon: React.ElementType; label: string; value: number | string; hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <p className="text-xl font-semibold leading-none">{value}</p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

/** Painel de limite administrativo por agência. */
function LimitOverrideCard({ agencyId }: { agencyId: string }) {
  const { data, isLoading } = useAdminAgencyDetail(agencyId)
  const mutation = useAdminAgencyLimitOverride()
  const quota = data?.quota
  const [value, setValue] = useState<string>('')
  const [reason, setReason] = useState('')

  const current = quota?.override?.max_members ?? null
  const effective = quota?.total ?? 3

  const save = () => {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 1) {
      toast.error('Informe um limite inteiro maior que zero.')
      return
    }
    if (reason.trim().length < 5) {
      toast.error('Descreva o motivo do ajuste (mínimo de 5 caracteres).')
      return
    }
    mutation.mutate({ agencyId, maxMembers: parsed, reason: reason.trim() }, {
      onSuccess: (res: any) => {
        toast.success(res?.warning ?? 'Limite administrativo atualizado.')
        setValue(''); setReason('')
      },
      onError: (e: any) => toast.error(e.message),
    })
  }

  const clear = () => mutation.mutate({ agencyId, clear: true }, {
    onSuccess: () => toast.success('Limite administrativo removido. O limite do plano volta a valer.'),
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Limite de acessos</CardTitle>
        <CardDescription className="text-xs">
          {isLoading ? 'Carregando…' : (
            <>
              {quota?.used ?? 0} de {effective} acessos em uso
              {quota?.plan ? ` · plano ${quota.plan}` : ''}
              {quota?.plan_limit ? ` · limite do plano ${quota.plan_limit}` : ''}
              {current ? ` · liberação administrativa de ${current}` : ''}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <div className="space-y-1">
            <Label className="text-xs">Novo limite</Label>
            <Input type="number" min={1} value={value} placeholder={String(effective)}
              onChange={e => setValue(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Motivo (registrado na auditoria)</Label>
            <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ex.: cortesia comercial durante migração da agência" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={save} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Salvar limite
          </Button>
          {current !== null && (
            <Button size="sm" variant="outline" onClick={clear} disabled={mutation.isPending}>
              Remover liberação
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Administração → Agências e Equipes.
 * Permite ao administrador da plataforma gerenciar colaboradores, perfis,
 * permissões, comunidade e limites de qualquer agência sem impersonação.
 */
export function AdminAgencyTeamsManager() {
  const { data: stats } = useAdminAgencyTeamsStats()
  const [search, setSearch] = useState('')
  const [plan, setPlan] = useState('all')
  const [team, setTeam] = useState<'all' | 'with' | 'without'>('all')
  const [atLimit, setAtLimit] = useState(false)
  const [pendingInvites, setPendingInvites] = useState(false)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdminAgencyRow | null>(null)

  const filters = useMemo(() => ({
    search, plan, team, atLimit, pendingInvites, page, pageSize: 20,
  }), [search, plan, team, atLimit, pendingInvites, page])

  const { data, isLoading } = useAdminAgencyList(filters)
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / 20))

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => { setPage(1); setter(v) }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Agências e Equipes</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie colaboradores, perfis de acesso, permissões e limites de qualquer agência.
          Toda ação fica registrada na auditoria da agência como ação do administrador da plataforma.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Building2} label="Agências com equipe" value={stats?.agencies_with_team ?? '—'} />
        <Kpi icon={Users} label="Colaboradores ativos" value={stats?.active_members ?? '—'} />
        <Kpi icon={Users} label="Inativos ou bloqueados" value={stats?.inactive_members ?? '—'} />
        <Kpi icon={MailWarning} label="Convites pendentes" value={stats?.pending_invites ?? '—'} />
        <Kpi icon={ShieldCheck} label="Perfis personalizados" value={stats?.custom_profiles ?? '—'} />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por agência, responsável ou ID"
                value={search} onChange={e => resetPage(setSearch)(e.target.value)} />
            </div>
            <Select value={plan} onValueChange={resetPage(setPlan)}>
              <SelectTrigger><SelectValue placeholder="Plano" /></SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map(p => (
                  <SelectItem key={p} value={p}>{p === 'all' ? 'Todos os planos' : p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={team} onValueChange={v => resetPage(setTeam)(v as any)}>
              <SelectTrigger><SelectValue placeholder="Equipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Com ou sem equipe</SelectItem>
                <SelectItem value="with">Somente com equipe</SelectItem>
                <SelectItem value="without">Somente sem equipe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={atLimit} onCheckedChange={resetPage(setAtLimit)} />
              No limite de acessos
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={pendingInvites} onCheckedChange={resetPage(setPendingInvites)} />
              Com convites pendentes
            </label>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : !items.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border py-12 text-center text-muted-foreground">
          <div className="mb-3 rounded-full bg-muted p-3"><Building2 className="h-5 w-5" /></div>
          <p className="text-sm font-medium">Nenhuma agência encontrada</p>
          <p className="text-xs">Ajuste a busca ou os filtros para localizar a agência desejada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(a => (
            <div key={a.agency_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{a.agency_name}</p>
                  <Badge variant="outline" className="text-[10px]">{a.plan}</Badge>
                  {a.limit_override !== null && (
                    <Badge variant="secondary" className="text-[10px]">limite ajustado</Badge>
                  )}
                  {a.seats_used >= a.seats_limit && (
                    <Badge variant="destructive" className="text-[10px]">no limite</Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {a.owner_name ?? 'Responsável não informado'}
                  {a.owner_email ? ` · ${a.owner_email}` : ''}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {a.active_members} ativos · {a.inactive_members} inativos · {a.pending_invites} convites ·{' '}
                  {a.seats_used}/{a.seats_limit} acessos
                  {a.last_activity
                    ? ` · última atividade ${new Date(a.last_activity).toLocaleDateString('pt-BR')}`
                    : ' · sem atividade registrada'}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSelected(a)}>
                <Settings2 className="mr-2 h-4 w-4" /> Gerenciar equipe
              </Button>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <span>{total} agências</span>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-7 w-7"
                disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>{page} / {lastPage}</span>
              <Button size="icon" variant="outline" className="h-7 w-7"
                disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={v => { if (!v) setSelected(null) }}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Equipe de {selected?.agency_name}</DialogTitle>
            <DialogDescription>
              Gestão administrativa direta, sem entrar no modo suporte.
              {selected?.owner_email ? ` Responsável: ${selected.owner_email}.` : ''}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <TeamScopeProvider
              scope={{
                agencyId: selected.agency_id,
                isPlatformAdmin: true,
                agencyName: selected.agency_name,
                ownerName: selected.owner_name,
                ownerEmail: selected.owner_email,
              }}
            >
              <div className="space-y-4">
                <LimitOverrideCard agencyId={selected.agency_id} />
                <TeamManagementCenter />
              </div>
            </TeamScopeProvider>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}