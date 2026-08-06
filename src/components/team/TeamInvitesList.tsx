import { useState } from 'react'
import { Loader2, MailPlus, Copy, RotateCw, Ban, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useAccessProfiles, useTeamAdminMutation, useTeamInvites, type TeamInviteRow } from '@/hooks/useTeamMembers'

function statusOf(i: TeamInviteRow) {
  if (i.accepted_at) return { label: 'Aceito', variant: 'default' as const }
  if (i.revoked_at) return { label: 'Cancelado', variant: 'outline' as const }
  if (new Date(i.expires_at) < new Date()) return { label: 'Expirado', variant: 'secondary' as const }
  return { label: 'Pendente', variant: 'secondary' as const }
}

export function TeamInvitesList({ disabledCreate }: { disabledCreate?: boolean }) {
  const { data: invites = [], isLoading } = useTeamInvites()
  const { data: profiles = [] } = useAccessProfiles()
  const mutation = useTeamAdminMutation()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [profileId, setProfileId] = useState('')
  const [confirmRevoke, setConfirmRevoke] = useState<TeamInviteRow | null>(null)

  const create = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error('Informe um e-mail válido')
    if (!profileId) return toast.error('Selecione o perfil de acesso do convidado')
    mutation.mutate({
      action: 'invite_create', origin: window.location.origin,
      email: email.trim(),
      full_name: fullName.trim() || null,
      role_title: roleTitle.trim() || null,
      department: department.trim() || null,
      access_profile_id: profileId,
    }, {
      onSuccess: (data: any) => {
        setOpen(false); setEmail(''); setFullName(''); setRoleTitle(''); setDepartment(''); setProfileId('')
        if (data?.invite_url) {
          void navigator.clipboard.writeText(data.invite_url).catch(() => {})
          toast.success(data?.emailed
            ? 'Convite enviado por e-mail e link copiado'
            : 'Convite criado e link copiado (envie o link manualmente)')
        } else {
          toast.success('Convite criado')
        }
      },
      onError: (e: any) => toast.error(e.message),
    })
  }

  const act = (action: string, id: string, successMsg: string) => {
    mutation.mutate({ action, id, origin: window.location.origin }, {
      onSuccess: (data: any) => {
        if (data?.invite_url) void navigator.clipboard.writeText(data.invite_url).catch(() => {})
        toast.success(data?.emailed ? 'Convite reenviado por e-mail e link copiado' : successMsg)
        setConfirmRevoke(null)
      },
      onError: (e: any) => toast.error(e.message),
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Convide por e-mail: o colaborador cria a própria senha e já entra com as permissões definidas.
        </p>
        <Button size="sm" onClick={() => setOpen(true)} disabled={disabledCreate}>
          <MailPlus className="mr-2 h-4 w-4" /> Convidar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : !invites.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <div className="mb-3 rounded-full bg-muted p-3"><Mail className="h-5 w-5" /></div>
          <p className="text-sm font-medium">Nenhum convite enviado</p>
          <p className="text-xs">Você também pode criar o acesso manualmente na aba Colaboradores.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invites.map(i => {
            const st = statusOf(i)
            const pending = !i.accepted_at && !i.revoked_at
            return (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.full_name || i.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {i.email}{i.access_profile_name ? ` · ${i.access_profile_name}` : ''}
                    {i.role_title ? ` · ${i.role_title}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                  {pending && (
                    <>
                      <Button variant="ghost" size="icon" title="Reenviar e copiar link"
                        onClick={() => act('invite_resend', i.id, 'Convite reenviado e link copiado')}>
                        <RotateCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Cancelar convite"
                        onClick={() => setConfirmRevoke(i)}>
                        <Ban className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar colaborador</DialogTitle>
            <DialogDescription>
              O convite expira em 7 dias e pode ser cancelado a qualquer momento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nome</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} />
              </div>
              <div>
                <Label>Departamento</Label>
                <Input value={department} onChange={e => setDepartment(e.target.value)} />
              </div>
              <div>
                <Label>Perfil de acesso *</Label>
                <Select value={profileId} onValueChange={setProfileId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {profiles.filter(p => p.key !== 'owner').map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Copy className="mr-2 h-4 w-4" /> Criar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmRevoke} onOpenChange={v => { if (!v) setConfirmRevoke(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar convite</AlertDialogTitle>
            <AlertDialogDescription>
              O link enviado para <strong>{confirmRevoke?.email}</strong> deixa de funcionar imediatamente
              e a vaga volta a ficar disponível. É possível enviar um novo convite depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={mutation.isPending}
              onClick={e => {
                e.preventDefault()
                if (confirmRevoke) act('invite_revoke', confirmRevoke.id, 'Convite cancelado')
              }}>
              Cancelar convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
