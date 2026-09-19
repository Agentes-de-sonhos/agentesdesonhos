import { useState } from "react";
import { Copy, Eye, EyeOff, Lock, Pencil, RefreshCw, ShieldAlert, Unlock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicLinkActions } from "@/components/shared/PublicLinkActions";
import { buildCarteiraLink } from "@/lib/carteira-domain";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import type { Trip } from "@/types/trip";

interface Props {
  trip: Trip;
  agencyName?: string | null;
  customDomain?: string | null;
  onCopyPassword: () => void;
  onUpdatePassword: (password: string) => Promise<void>;
  onRegeneratePassword: () => Promise<void>;
  onUnlock: () => Promise<void>;
}

export function WalletAccessSettings({ trip, agencyName, customDomain, onCopyPassword, onUpdatePassword, onRegeneratePassword, onUnlock }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const publicUrl = trip.public_access_code && agencyName
    ? buildCarteiraLink(agencyName, trip.public_access_code, customDomain)
    : trip.slug ? `${PUBLIC_DOMAIN}/c/${trip.slug}`
    : trip.share_token ? `${PUBLIC_DOMAIN}/viagem/${trip.share_token}` : "";
  const serviceTypes = (trip.services || []).map((service) => service.service_type);

  const save = async () => {
    if (password.trim().length < 4) return;
    setSaving(true);
    try { await onUpdatePassword(password.trim()); setEditing(false); setPassword(""); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {trip.is_locked && (
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <div className="flex items-start gap-2 text-sm text-destructive"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">Acesso bloqueado por segurança</p><p className="mt-1 text-xs">O cliente errou a senha três vezes. Desbloqueie mantendo a senha atual ou gere uma nova.</p></div></div>
          <Button size="sm" variant="destructive" onClick={onUnlock}><Unlock className="mr-1.5 h-4 w-4" />Desbloquear acesso</Button>
        </div>
      )}
      <section aria-labelledby="wallet-password-title" className="rounded-lg border bg-card p-4">
        <h4 id="wallet-password-title" className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4 text-violet-500" />Senha de acesso</h4>
        {editing ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="wallet-access-password" className="sr-only">Nova senha de acesso</label>
            <Input id="wallet-access-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nova senha com pelo menos 4 caracteres" className="min-w-0 flex-1" autoFocus />
            <Button size="sm" onClick={save} disabled={saving || password.trim().length < 4}>{saving ? "Salvando..." : "Salvar"}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setPassword(""); }}><X className="mr-1 h-4 w-4" />Cancelar</Button>
          </div>
        ) : (
          <div className="mt-3 flex min-w-0 items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-sm">{showPassword ? trip.access_password : "••••••"}</code>
            <Button variant="outline" size="icon" className="min-h-11 min-w-11" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
            <Button variant="outline" size="icon" className="min-h-11 min-w-11" onClick={onCopyPassword} aria-label="Copiar senha"><Copy className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="min-h-11 min-w-11" onClick={() => setEditing(true)} aria-label="Editar senha"><Pencil className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="min-h-11 min-w-11" onClick={onRegeneratePassword} aria-label="Regenerar senha"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        )}
      </section>
      <section aria-labelledby="wallet-link-title" className="min-w-0 rounded-lg border bg-card p-4">
        <h4 id="wallet-link-title" className="text-sm font-semibold">Link público</h4>
        {publicUrl ? (
          <><code className="mt-3 block w-full truncate rounded-md bg-muted px-3 py-2 text-sm" title={publicUrl}>{publicUrl}</code><PublicLinkActions className="mt-3" type="wallet" publicUrl={publicUrl} showOpen message={{ clientFirstName: trip.client_name, destination: trip.destination, tripName: trip.trip_title || trip.destination, startDate: trip.start_date, endDate: trip.end_date, serviceTypes, agencyName: agencyName || undefined, accessPassword: trip.access_password }} /></>
        ) : <p className="mt-2 text-sm text-muted-foreground">O link público ainda não está disponível.</p>}
      </section>
    </div>
  );
}