import { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { usePermissions, type PermissionKey } from '@/hooks/usePermissions'

interface PermissionGateProps {
  permission: PermissionKey | string
  children: ReactNode
  fallback?: ReactNode
  /** Se true, renderiza nada (silencioso). Por padrão mostra mensagem amigável. */
  silent?: boolean
}

export function PermissionGate({ permission, children, fallback, silent }: PermissionGateProps) {
  const { can } = usePermissions()
  if (can(permission)) return <>{children}</>
  if (fallback !== undefined) return <>{fallback}</>
  if (silent) return null
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Lock className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium">Você não possui permissão para acessar esta área.</p>
      <p className="text-xs mt-1">Fale com o administrador da agência para liberar o acesso.</p>
    </div>
  )
}