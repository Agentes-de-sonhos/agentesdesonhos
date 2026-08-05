import { useEffect, useState } from 'react'
import { Loader2, Globe, Building2, Users, MessageSquare, MessagesSquare } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { useCommunitySettings, useSaveCommunitySettings } from '@/hooks/useTeamMembers'
import { useTeamSession } from '@/contexts/TeamSessionContext'

type Preset = 'full' | 'agency_only' | 'disabled' | 'custom'

interface Flags {
  public_community_enabled: boolean
  internal_community_enabled: boolean
  online_users_enabled: boolean
  internal_chat_enabled: boolean
  external_chat_enabled: boolean
}

const PRESETS: Record<Exclude<Preset, 'custom'>, Flags> = {
  full: {
    public_community_enabled: true, internal_community_enabled: true,
    online_users_enabled: true, internal_chat_enabled: true, external_chat_enabled: true,
  },
  agency_only: {
    public_community_enabled: false, internal_community_enabled: true,
    online_users_enabled: true, internal_chat_enabled: true, external_chat_enabled: false,
  },
  disabled: {
    public_community_enabled: false, internal_community_enabled: false,
    online_users_enabled: false, internal_chat_enabled: false, external_chat_enabled: false,
  },
}

const ITEMS: { key: keyof Flags; label: string; description: string; Icon: typeof Globe }[] = [
  { key: 'public_community_enabled', label: 'Comunidade pública', description: 'Participar da comunidade com agentes de outras agências.', Icon: Globe },
  { key: 'internal_community_enabled', label: 'Comunidade interna', description: 'Mural e publicações visíveis apenas para a sua agência.', Icon: Building2 },
  { key: 'online_users_enabled', label: 'Usuários online', description: 'Exibir o painel de agentes online na página inicial.', Icon: Users },
  { key: 'internal_chat_enabled', label: 'Chat interno', description: 'Conversas entre colaboradores da mesma agência.', Icon: MessageSquare },
  { key: 'external_chat_enabled', label: 'Chat externo', description: 'Conversas com agentes de outras agências.', Icon: MessagesSquare },
]

export function AgencyCommunitySettings() {
  const { data, isLoading } = useCommunitySettings()
  const save = useSaveCommunitySettings()
  const { refresh } = useTeamSession()

  const [preset, setPreset] = useState<Preset>('full')
  const [flags, setFlags] = useState<Flags>(PRESETS.full)

  useEffect(() => {
    if (!data) return
    setPreset(data.preset ?? 'full')
    setFlags({
      public_community_enabled: data.public_community_enabled,
      internal_community_enabled: data.internal_community_enabled,
      online_users_enabled: data.online_users_enabled,
      internal_chat_enabled: data.internal_chat_enabled,
      external_chat_enabled: data.external_chat_enabled,
    })
  }, [data])

  const applyPreset = (p: Preset) => {
    setPreset(p)
    if (p !== 'custom') setFlags(PRESETS[p])
  }

  const setFlag = (key: keyof Flags, v: boolean) => {
    setFlags(prev => ({ ...prev, [key]: v }))
    setPreset('custom')
  }

  const submit = () => {
    save.mutate({ ...flags, preset }, {
      onSuccess: async () => {
        toast.success('Configurações de comunidade atualizadas')
        await refresh()
      },
      onError: (e: any) => toast.error(e.message),
    })
  }

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>Modo de convivência</Label>
        <p className="mb-3 text-xs text-muted-foreground">
          Escolha um modo pronto ou ajuste cada item individualmente. As regras valem para você e para todos os colaboradores.
        </p>
        <RadioGroup value={preset} onValueChange={v => applyPreset(v as Preset)} className="grid gap-2 sm:grid-cols-4">
          {([
            ['full', 'Aberto'],
            ['agency_only', 'Somente minha agência'],
            ['disabled', 'Desativado'],
            ['custom', 'Personalizado'],
          ] as [Preset, string][]).map(([v, label]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm hover:bg-accent">
              <RadioGroupItem value={v} id={`preset-${v}`} />
              {label}
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        {ITEMS.map(({ key, label, description, Icon }) => (
          <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-full bg-muted p-2"><Icon className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch checked={flags[key]} onCheckedChange={v => setFlag(key, v)} />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  )
}
