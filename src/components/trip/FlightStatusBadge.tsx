import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Plane, Clock, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface FlightStatusData {
  status: string;
  status_label: string;
  departure_actual: string | null;
  arrival_actual: string | null;
  delay_minutes: number;
  terminal: string | null;
  gate: string | null;
  last_checked_at: string;
}

interface FlightStatusBadgeProps {
  tripServiceId: string;
  flightNumber: string;
  flightDate: string;
}

const statusConfig: Record<string, { color: string; icon: typeof Plane }> = {
  scheduled: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle },
  filed: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: CheckCircle },
  active: { color: "bg-green-100 text-green-800 border-green-200 animate-pulse", icon: Plane },
  landed: { color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle },
  arrived: { color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle },
  cancelled: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
  delayed: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  diverted: { color: "bg-orange-100 text-orange-800 border-orange-200", icon: AlertTriangle },
};

export function FlightStatusBadge({ tripServiceId, flightNumber, flightDate }: FlightStatusBadgeProps) {
  const [statusData, setStatusData] = useState<FlightStatusData | null>(null);

  useEffect(() => {
    if (!tripServiceId || !flightNumber || !flightDate) return;

    // Check if flight is within monitoring window (±24h)
    const now = new Date();
    const fd = new Date(flightDate + 'T12:00:00');
    const diffHours = Math.abs(now.getTime() - fd.getTime()) / (1000 * 60 * 60);
    if (diffHours > 48) return;

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('flight_status_updates')
        .select('status, status_label, departure_actual, arrival_actual, delay_minutes, terminal, gate, last_checked_at')
        .eq('trip_service_id', tripServiceId)
        .eq('flight_number', flightNumber.replace(/\s+/g, '').toUpperCase())
        .eq('flight_date', flightDate)
        .maybeSingle();

      if (data) setStatusData(data as FlightStatusData);
    };

    fetchStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`flight-status-${tripServiceId}-${flightNumber}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'flight_status_updates',
        filter: `trip_service_id=eq.${tripServiceId}`,
      }, (payload: any) => {
        const rec = payload.new;
        if (rec && rec.flight_number === flightNumber.replace(/\s+/g, '').toUpperCase()) {
          setStatusData(rec);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripServiceId, flightNumber, flightDate]);

  if (!statusData) return null;

  const config = statusConfig[statusData.status] || statusConfig.scheduled;
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-1">
      <Badge className={`${config.color} gap-1 text-xs font-medium px-2 py-1`}>
        <Icon className="h-3 w-3" />
        {statusData.status_label}
        {statusData.delay_minutes > 0 && (
          <span className="ml-1">({statusData.delay_minutes}min)</span>
        )}
      </Badge>
      {(statusData.terminal || statusData.gate) && (
        <span className="text-[10px] text-muted-foreground">
          {statusData.terminal && `Terminal ${statusData.terminal}`}
          {statusData.terminal && statusData.gate && ' • '}
          {statusData.gate && `Portão ${statusData.gate}`}
        </span>
      )}
      {statusData.departure_actual && statusData.status === 'active' && (
        <span className="text-[10px] text-muted-foreground">
          Decolou: {new Date(statusData.departure_actual).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}
