import { useNavigate } from 'react-router-dom'
import { Users, DollarSign, LogOut } from 'lucide-react'
import { useTeamSession } from '@/contexts/TeamSessionContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function TeamDashboard() {
  const { member, hasModule, loading } = useTeamSession()
  const navigate = useNavigate()

  if (loading) return null
  if (!member) {
    navigate('/auth', { replace: true })
    return null
  }

  const firstName = member.full_name.split(' ')[0]
  const canClients = hasModule('clients')
  const canFinancial = hasModule('financial')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Área do colaborador</span>
            <span className="text-sm font-medium">{member.full_name}{member.role_title ? ` · ${member.role_title}` : ''}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { void supabase.auth.signOut().then(() => navigate('/auth')) }}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-2 text-muted-foreground">Escolha onde quer começar.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {canClients && (
            <Card
              className="cursor-pointer p-8 transition hover:shadow-md"
              onClick={() => navigate('/gestao-clientes/dashboard')}
            >
              <div className="flex items-start justify-between">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <h2 className="mt-6 text-xl font-semibold">Clientes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Clientes, oportunidades, operações e metas.
              </p>
            </Card>
          )}

          {canFinancial && (
            <Card
              className="cursor-pointer p-8 transition hover:shadow-md"
              onClick={() => navigate('/financeiro')}
            >
              <div className="flex items-start justify-between">
                <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              <h2 className="mt-6 text-xl font-semibold">Gestão Financeira</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Entradas, despesas, vendas e comissões.
              </p>
            </Card>
          )}

          {!canClients && !canFinancial && (
            <Card className="col-span-full p-8 text-center text-muted-foreground">
              Sua conta ainda não possui módulos liberados. Fale com o administrador da agência.
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}