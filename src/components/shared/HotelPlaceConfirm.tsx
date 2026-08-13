import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, BadgeCheck, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { PlaceMapCard } from "@/components/shared/PlaceMapCard";
import {
  buildHotelSearchQuery,
  classifyMatches,
  type MatchConfidence,
  type PlaceCandidate,
} from "@/lib/hotelPlaceMatch";

export interface HotelPlaceDetail extends PlaceCandidate {
  phone?: string | null;
  website?: string | null;
  maps_url?: string | null;
  state?: string | null;
  postal_code?: string | null;
}

interface HotelPlaceConfirmProps {
  hotelName?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  /** place_id já associado ao serviço (confirmado anteriormente). */
  placeId?: string | null;
  /** Dados oficiais já persistidos, para exibir o estado confirmado. */
  confirmed?: {
    name?: string | null;
    address?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    phone?: string | null;
    website?: string | null;
  } | null;
  /** Chamado quando a agência confirma (ou o sistema autoconfirma) um lugar. */
  onConfirm: (detail: HotelPlaceDetail) => void;
  /** Remove a associação — o serviço volta a usar apenas os dados importados. */
  onClear: () => void;
  /** Slot opcional (galeria de fotos do Google) exibido no estado confirmado. */
  photoSlot?: React.ReactNode;
}

const CONFIDENCE_STYLE: Record<MatchConfidence, string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

/**
 * Conferência de hospedagem: identifica o hotel real no Google Places e só
 * persiste os dados oficiais após confirmação. Em confiança alta a associação
 * é sugerida automaticamente, mas sempre reversível.
 */
export function HotelPlaceConfirm({
  hotelName,
  city,
  country,
  address,
  placeId,
  confirmed,
  onConfirm,
  onClear,
  photoSlot,
}: HotelPlaceConfirmProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<MatchConfidence | null>(null);
  const [candidates, setCandidates] = useState<HotelPlaceDetail[]>([]);
  const [manualQuery, setManualQuery] = useState("");
  const autoRanForRef = useRef<string | null>(null);

  const search = useCallback(
    async (query: string, auto: boolean) => {
      if (query.trim().length < 3) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("hotel-place-match", {
          body: { query: query.trim(), limit: 4 },
        });
        if (fnError) throw fnError;
        const list = (data?.candidates || []) as HotelPlaceDetail[];
        const result = classifyMatches({ hotelName: hotelName || query, city, country, address }, list);
        setCandidates(result.ranked.map((r) => r.candidate as HotelPlaceDetail));
        setConfidence(result.confidence);
        if (auto && result.confidence === "high" && result.best) {
          onConfirm(result.best.candidate as HotelPlaceDetail);
        }
      } catch (e: any) {
        console.error("[HotelPlaceConfirm] falha na identificação", e?.message || e);
        setError("Não foi possível consultar o Google agora. Tente novamente.");
      } finally {
        setLoading(false);
      }
    },
    [hotelName, city, country, address, onConfirm],
  );

  // Identificação automática ao abrir a conferência de um hotel ainda sem vínculo.
  useEffect(() => {
    if (placeId) return;
    const name = (hotelName || "").trim();
    if (name.length < 4) return;
    const key = buildHotelSearchQuery({ hotelName: name, city, country });
    if (autoRanForRef.current === key) return;
    autoRanForRef.current = key;
    const t = setTimeout(() => search(key, true), 700);
    return () => clearTimeout(t);
  }, [placeId, hotelName, city, country, search]);

  const isConfirmed = !!placeId;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Identificação do hotel
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Confirmamos o hotel real no Google para trazer endereço, contato, mapa e fotos oficiais.
          </p>
        </div>
        {isConfirmed ? (
          <Badge variant="outline" className={CONFIDENCE_STYLE.high}>
            <BadgeCheck className="h-3 w-3 mr-1" /> Confirmado
          </Badge>
        ) : confidence ? (
          <Badge variant="outline" className={CONFIDENCE_STYLE[confidence]}>
            {confidence === "medium" ? "Revisar sugestões" : "Não confirmado"}
          </Badge>
        ) : null}
      </div>

      {isConfirmed && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{confirmed?.name || hotelName}</p>
          {confirmed?.address && <p className="text-xs text-muted-foreground">{confirmed.address}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {confirmed?.phone && <span>📞 {confirmed.phone}</span>}
            {confirmed?.website && (
              <a href={confirmed.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                🌐 Site oficial
              </a>
            )}
          </div>
          <PlaceMapCard
            compact
            latitude={confirmed?.latitude}
            longitude={confirmed?.longitude}
            address={confirmed?.address || address}
            name={confirmed?.name || hotelName}
            placeId={placeId}
          />
          {photoSlot}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-full text-xs"
              onClick={() => {
                autoRanForRef.current = null;
                search(buildHotelSearchQuery({ hotelName: hotelName || "", city, country }), false);
              }}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Alterar hotel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-full text-xs text-destructive hover:text-destructive"
              onClick={onClear}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Remover associação
            </Button>
          </div>
        </div>
      )}

      {!isConfirmed && (
        <div className="space-y-2">
          {loading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Identificando o hotel no Google...
            </p>
          )}
          {!loading && confidence === "low" && (
            <p className="text-xs text-amber-700 flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              Não encontramos um hotel correspondente com segurança. Refine a busca abaixo — nada foi alterado.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Buscar hotel no Google (nome + cidade)"
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search(manualQuery, false);
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 shrink-0"
              onClick={() =>
                search(manualQuery || buildHotelSearchQuery({ hotelName: hotelName || "", city, country }), false)
              }
              disabled={loading}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {candidates.length > 0 && (
            <ul className="space-y-2">
              {candidates.map((c) => (
                <li key={c.place_id}>
                  <button
                    type="button"
                    onClick={() => onConfirm(c)}
                    className="w-full text-left rounded-xl border border-border/60 bg-background px-3 py-2 hover:border-primary/50 hover:bg-primary/5 transition"
                  >
                    <span className="block text-sm font-medium text-foreground">{c.name}</span>
                    {c.formatted_address && (
                      <span className="block text-[11px] text-muted-foreground">{c.formatted_address}</span>
                    )}
                    <span className="block text-[11px] text-primary mt-0.5">Usar este hotel</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}