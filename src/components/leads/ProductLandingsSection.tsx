import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, ExternalLink, Eye, Loader2, Settings2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import {
  LANDING_PRODUCTS,
  buildProductLandingUrl,
  type LandingProduct,
} from "@/config/landingProducts";
import {
  useProductLandings,
  useAgencyPublicSlug,
  type ProductLanding,
} from "@/hooks/useProductLandings";
import {
  DAY_KEYS,
  DAY_LABELS,
  DEFAULT_OFFICE_HOURS,
  DEFAULT_TIMEZONE,
  type DayKey,
  type OfficeHours,
} from "@/lib/officeHours";

function slugifyAgency(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export function ProductLandingsSection() {
  const { list, enable, update, setStatus } = useProductLandings();
  const { data: profile } = useAgencyPublicSlug();
  const [editing, setEditing] = useState<{ product: LandingProduct; landing?: ProductLanding } | null>(
    null
  );

  const byProduct = useMemo(() => {
    const map = new Map<string, ProductLanding>();
    (list.data ?? []).forEach((l) => map.set(l.product_key, l));
    return map;
  }, [list.data]);

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-pink-600" />
          Modelos prontos
        </h2>
        <p className="text-sm text-muted-foreground">
          Landing pages completas de destinos, com a sua marca e captação direto no seu CRM.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {LANDING_PRODUCTS.map((product) => {
          const landing = byProduct.get(product.productKey);
          const active = landing?.status === "active";
          const url = landing ? buildProductLandingUrl(product, landing.slug) : null;
          const conversion = landing
            ? conversionRate(landing.views_count, landing.leads_count)
            : "0";
          const testMode = isTestModeActive(landing?.test_mode_until);

          return (
            <Card key={product.productKey} className="border-0 shadow-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-tight">{product.name}</h3>
                    <p className="text-xs text-muted-foreground">{product.summary}</p>
                  </div>
                  {landing && (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={active ? "default" : "secondary"} className="text-xs">
                        {active ? "Ativa" : "Desativada"}
                      </Badge>
                      {testMode && (
                        <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">
                          Homologação
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {testMode && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    Modo homologação ativo: visitas e leads registrados agora são marcados como
                    teste e não entram nas métricas comerciais.
                  </p>
                )}

                {landing && url && (
                  <>
                    <p className="truncate rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      {url.replace("https://", "")}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-muted p-2">
                        <Eye className="mx-auto mb-0.5 h-3.5 w-3.5 text-muted-foreground" />
                        <p className="font-semibold">{landing.views_count}</p>
                        <p className="text-muted-foreground">visitas</p>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <Users className="mx-auto mb-0.5 h-3.5 w-3.5 text-muted-foreground" />
                        <p className="font-semibold">{landing.leads_count}</p>
                        <p className="text-muted-foreground">leads</p>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <p className="font-semibold text-pink-600">{conversion}%</p>
                        <p className="text-muted-foreground">conv.</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex flex-wrap gap-2">
                  {landing ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing({ product, landing })}>
                        <Settings2 className="mr-1 h-3.5 w-3.5" /> Configurar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => url && window.open(url, "_blank")}>
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> Ver
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => url && copy(url)}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Link
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={setStatus.isPending}
                        onClick={() =>
                          setStatus.mutate({ id: landing.id, status: active ? "disabled" : "active" })
                        }
                      >
                        {active ? "Desativar" : "Reativar"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="bg-pink-600 text-white hover:bg-pink-700"
                        onClick={() => setEditing({ product })}
                      >
                        Ativar com minha marca
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(product.demoPath, "_blank")}
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> Ver exemplo
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editing && (
        <ProductLandingDialog
          product={editing.product}
          landing={editing.landing}
          suggestedSlug={
            editing.landing?.slug ||
            profile?.public_slug ||
            slugifyAgency(profile?.agency_name || profile?.name || "")
          }
          saving={enable.isPending || update.isPending}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            if (editing.landing) {
              await update.mutateAsync({ id: editing.landing.id, ...values });
            } else {
              await enable.mutateAsync({ productKey: editing.product.productKey, ...values });
            }
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

type DialogValues = {
  slug: string;
  override_agency_name: string | null;
  override_whatsapp: string | null;
  override_consultant_name: string | null;
  override_consultant_role: string | null;
  override_email: string | null;
  override_city: string | null;
  timezone: string;
  office_hours: OfficeHours;
};

function ProductLandingDialog({
  product,
  landing,
  suggestedSlug,
  saving,
  onClose,
  onSubmit,
}: {
  product: LandingProduct;
  landing?: ProductLanding;
  suggestedSlug: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: DialogValues) => Promise<void>;
}) {
  const [slug, setSlug] = useState(suggestedSlug);
  const [agencyName, setAgencyName] = useState(landing?.override_agency_name ?? "");
  const [whatsapp, setWhatsapp] = useState(landing?.override_whatsapp ?? "");
  const [consultant, setConsultant] = useState(landing?.override_consultant_name ?? "");
  const [role, setRole] = useState(landing?.override_consultant_role ?? "");
  const [email, setEmail] = useState(landing?.override_email ?? "");
  const [city, setCity] = useState(landing?.override_city ?? "");
  const [timezone, setTimezone] = useState(landing?.timezone ?? DEFAULT_TIMEZONE);
  const [hours, setHours] = useState<OfficeHours>(landing?.office_hours ?? DEFAULT_OFFICE_HOURS);

  const normalizedSlug = slugifyAgency(slug);
  const previewUrl = normalizedSlug ? buildProductLandingUrl(product, normalizedSlug) : "";
  const slugValid = normalizedSlug.length >= 3;

  const setDay = (day: DayKey, enabled: boolean) =>
    setHours((prev) => ({ ...prev, [day]: enabled ? [["08:00", "18:00"]] : [] }));

  const setWindow = (day: DayKey, index: 0 | 1, value: string) =>
    setHours((prev) => {
      const list = [...(prev[day] ?? [["08:00", "18:00"]])];
      const current = [...(list[0] ?? ["08:00", "18:00"])] as [string, string];
      current[index] = value;
      list[0] = current;
      return { ...prev, [day]: list };
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Personalize os dados exibidos na página. Campos em branco usam automaticamente os dados
            do seu perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pl-slug">Endereço da sua página</Label>
            <Input
              id="pl-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="minha-agencia"
            />
            <p className="break-all text-xs text-muted-foreground">
              {previewUrl || "Informe um endereço com pelo menos 3 caracteres."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome da agência" value={agencyName} onChange={setAgencyName} placeholder="Do seu perfil" />
            <Field
              label="WhatsApp (com DDI e DDD)"
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="5511999999999"
            />
            <Field label="Consultor(a)" value={consultant} onChange={setConsultant} placeholder="Do seu perfil" />
            <Field label="Cargo" value={role} onChange={setRole} placeholder="Consultor(a) de viagens" />
            <Field label="E-mail de contato" value={email} onChange={setEmail} placeholder="opcional" />
            <Field label="Cidade" value={city} onChange={setCity} placeholder="Do seu perfil" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pl-tz">Fuso horário</Label>
            <Input id="pl-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Horário de atendimento no WhatsApp</Label>
            <p className="text-xs text-muted-foreground">
              Fora desses horários o botão de WhatsApp é substituído por “Solicitar contato”, que leva
              o visitante ao formulário.
            </p>
            <div className="space-y-2">
              {DAY_KEYS.map((day) => {
                const list = hours[day] ?? [];
                const enabled = list.length > 0;
                const [from, to] = (list[0] ?? ["08:00", "18:00"]) as [string, string];
                return (
                  <div key={day} className="flex items-center gap-2">
                    <Switch checked={enabled} onCheckedChange={(v) => setDay(day, v)} />
                    <span className="w-20 text-sm">{DAY_LABELS[day]}</span>
                    <Input
                      type="time"
                      value={from}
                      disabled={!enabled}
                      onChange={(e) => setWindow(day, 0, e.target.value)}
                      className="h-9 w-28"
                    />
                    <span className="text-xs text-muted-foreground">às</span>
                    <Input
                      type="time"
                      value={to}
                      disabled={!enabled}
                      onChange={(e) => setWindow(day, 1, e.target.value)}
                      className="h-9 w-28"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            className="bg-pink-600 text-white hover:bg-pink-700"
            disabled={!slugValid || saving}
            onClick={() =>
              onSubmit({
                slug: normalizedSlug,
                override_agency_name: agencyName.trim() || null,
                override_whatsapp: whatsapp.replace(/\D/g, "") || null,
                override_consultant_name: consultant.trim() || null,
                override_consultant_role: role.trim() || null,
                override_email: email.trim() || null,
                override_city: city.trim() || null,
                timezone: timezone.trim() || DEFAULT_TIMEZONE,
                office_hours: hours,
              })
            }
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {landing ? "Salvar alterações" : "Publicar página"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}