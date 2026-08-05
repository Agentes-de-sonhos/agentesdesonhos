import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function AceitarConvite() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invite, setInvite] = useState<{ email: string; full_name: string | null; role_title: string | null } | null>(null)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.title = 'Aceitar convite | Agentes de Sonhos'
    const run = async () => {
      const { data, error } = await supabase.functions.invoke('team-invite-accept', {
        body: { token, mode: 'inspect' },
      })
      const payload = data as any
      if (error || payload?.error) setError(payload?.error ?? 'Convite inválido.')
      else { setInvite(payload); setFullName(payload.full_name ?? '') }
      setLoading(false)
    }
    void run()
  }, [token])

  const submit = async () => {
    if (!fullName.trim()) return toast.error('Informe seu nome')
    if (password.length < 6) return toast.error('A senha precisa ter ao menos 6 caracteres')
    if (password !== password2) return toast.error('As senhas não coincidem')
    setSaving(true)
    const { data, error } = await supabase.functions.invoke('team-invite-accept', {
      body: { token, password, full_name: fullName.trim() },
    })
    setSaving(false)
    const payload = data as any
    if (error || payload?.error) return toast.error(payload?.error ?? 'Não foi possível concluir o convite.')
    toast.success('Acesso criado! Entre com seu e-mail e a senha que você definiu.')
    navigate('/auth', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md p-8">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : error ? (
          <div className="text-center">
            <h1 className="text-xl font-semibold">Convite indisponível</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button className="mt-6" variant="outline" onClick={() => navigate('/auth')}>Ir para o login</Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h1 className="text-lg font-semibold">Criar seu acesso</h1>
                <p className="text-xs text-muted-foreground">{invite?.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Seu nome completo</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Criar senha</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <div>
                <Label>Confirmar senha</Label>
                <Input type="password" value={password2} onChange={e => setPassword2(e.target.value)} autoComplete="new-password" />
              </div>
              <Button className="w-full" onClick={submit} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ativar meu acesso
              </Button>
            </div>
          </>
        )}
      </Card>
    </main>
  )
}
