import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAccessProfiles, useTeamAdminMutation, useTeamMembers, type AccessProfileRow } from '@/hooks/useTeamMembers'
import { PermissionMatrix } from './PermissionMatrix'
import { ScopeSelector } from './ScopeSelector'
import type { DataScope } from '@/lib/teamPermissions'

interface DraftState {
  id?: string
  name: string
  description: string
  keys: Set<string>
  scopes: Record<string, DataScope>
  sourceId?: string
}

const emptyDraft = (): DraftState => ({ name: '', description: '', keys: new Set(), scopes: {} })

/**
 * Perfis de acesso da agência: permite criar do zero, duplicar um perfil nativo
 * e ajustar permissões/escopos sem alterar os perfis nativos da plataforma.
 */
export function AccessProfilesManager() {
  const { data: profiles = [], isLoading } = useAccessProfiles()
  const { data: members = [] } = useTeamMembers()
  const mutation = useTeamAdminMutation()
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AccessProfileRow | null>(null)
  const [migrateTo, setMigrateTo] = useState<string>('')

  const native = useMemo(() => profiles.filter(p => p.is_native), [profiles])
  const custom = useMemo(() => profiles.filter(p => !p.is_native), [profiles])

  const usageCount = (profileId: string) =>
    members.filter((m: any) => m.access_profile_id === profileId).length

  const openNew = () => setDraft(emptyDraft())

  const openDuplicate = (p: AccessProfileRow) => setDraft({
    name: `${p.name} (cópia)`,
    description: p.description ?? '',
    keys: new Set(p.permission_keys ?? []),
    scopes: { ...(p.scopes ?? {}) },
    sourceId: p.id,
  })

  const openEdit = (p: AccessProfileRow) => setDraft({
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    keys: new Set(p.permission_keys ?? []),
    scopes: { ...(p.scopes ?? {}) },
  })

  const save = () => {
    if (!draft) return
    if (!draft.name.trim()) { toast.error('Informe o nome do perfil.'); return }
    const payload = draft.id
      ? {
          action: 'profile_update', id: draft.id, name: draft.name.trim(),
          description: draft.description, permission_keys: [...draft.keys], scopes: draft.scopes,
        }
      : {
          action: 'profile_create', name: draft.name.trim(),
          description: draft.description, permission_keys: [...draft.keys], scopes: draft.scopes,
        }
    mutation.mutate(payload, {
      onSuccess: () => { toast.success(draft.id ? 'Perfil atualizado' : 'Perfil criado'); setDraft(null) },
      onError: (e: any) => toast.error(e.message),
    })
  }

  const doDelete = () => {
    if (!confirmDelete) return
    mutation.mutate(
      { action: 'profile_delete', id: confirmDelete.id, migrate_to_profile_id: migrateTo || undefined },
      {
        onSuccess: () => { toast.success('Perfil excluído'); setConfirmDelete(null); setMigrateTo('') },
        onError: (e: any) => toast.error(e.message),
      },
    )
  }

  const renderRow = (p: AccessProfileRow) => {
    const inUse = usageCount(p.id)
    return (
      <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{p.name}</p>
            {p.is_native
              ? <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" />Nativo</Badge>
              : <Badge variant="outline">Personalizado</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {(p.permission_keys ?? []).length} permissões
            {inUse > 0 ? ` · ${inUse} colaborador(es)` : ''}
            {p.description ? ` · ${p.description}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => openDuplicate(p)}>
            <Copy className="mr-1 h-3.5 w-3.5" />Duplicar
          </Button>
          {!p.is_native && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />Editar
              </Button>
              <Button
                size="sm" variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => { setConfirmDelete(p); setMigrateTo('') }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Perfis nativos servem de ponto de partida e não podem ser alterados. Duplique um
          perfil ou crie um novo para ajustar permissões e escopos da sua agência.
        </p>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Novo perfil</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {custom.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Da sua agência</p>
              {custom.map(renderRow)}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Perfis nativos</p>
            {native.map(renderRow)}
          </div>
        </div>
      )}

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? 'Editar perfil de acesso' : 'Novo perfil de acesso'}</DialogTitle>
            <DialogDescription>
              As permissões definidas aqui são aplicadas aos colaboradores vinculados a este perfil.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-name">Nome do perfil</Label>
                  <Input
                    id="profile-name" value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Ex.: Consultor de vendas júnior"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-desc">Descrição (opcional)</Label>
                  <Textarea
                    id="profile-desc" rows={2} value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </div>
              </div>

              <Separator />
              <PermissionMatrix
                value={draft.keys}
                onChange={(next) => setDraft({ ...draft, keys: next })}
              />
              <Separator />
              <ScopeSelector
                value={draft.scopes}
                onChange={(next) => setDraft({ ...draft, scopes: next })}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancelar</Button>
            <Button onClick={save} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil de acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && usageCount(confirmDelete.id) > 0
                ? `Este perfil está em uso por ${usageCount(confirmDelete.id)} colaborador(es). Escolha para qual perfil migrá-los.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmDelete && usageCount(confirmDelete.id) > 0 && (
            <Select value={migrateTo} onValueChange={setMigrateTo}>
              <SelectTrigger><SelectValue placeholder="Migrar colaboradores para..." /></SelectTrigger>
              <SelectContent>
                {profiles.filter(p => p.id !== confirmDelete.id).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive" onClick={doDelete}
              disabled={mutation.isPending || (!!confirmDelete && usageCount(confirmDelete.id) > 0 && !migrateTo)}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
