import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const OPTIONS = (word: "antes" | "depois") => [
  { v: "0", l: "Desligado" },
  { v: "1", l: `1 dia ${word}` },
  { v: "2", l: `2 dias ${word}` },
  { v: "3", l: `3 dias ${word}` },
];

export function TripReminderSettingsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dep, setDep] = useState("1");
  const [ret, setRet] = useState("1");

  useEffect(() => {
    if (!user) return;
    supabase.from("trip_email_reminder_settings").select("departure_days, return_days").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) { setDep(String(data.departure_days)); setRet(String(data.return_days)); }
      });
  }, [user]);

  const save = async (d: string, r: string) => {
    if (!user) return;
    const { error } = await supabase.from("trip_email_reminder_settings").upsert({
      user_id: user.id, departure_days: Number(d), return_days: Number(r), updated_at: new Date().toISOString(),
    });
    toast(error ? { title: "Não foi possível salvar", variant: "destructive" } : { title: "Lembretes atualizados" });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Lembretes de viagem por e-mail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Todo dia às 7h você recebe um resumo com os clientes que vão embarcar ou que acabaram de voltar,
          com base nas datas das viagens.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Aviso de embarque</Label>
            <Select value={dep} onValueChange={(v) => { setDep(v); save(v, ret); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OPTIONS("antes").map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Aviso de retorno</Label>
            <Select value={ret} onValueChange={(v) => { setRet(v); save(dep, v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OPTIONS("depois").map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
