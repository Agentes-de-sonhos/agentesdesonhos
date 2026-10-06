/**
 * Gestão → Apresentação (EXCLUSIVO do SiteLab Base).
 *
 * Tela para preparar a demonstração para um prospect: quais seções e temas da
 * home aparecem e a identidade provisória (nome, logotipo, 3 cores). Grava só
 * no navegador (`sitelabPresentation`), nunca em perfis ou tabelas.
 */
import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_SECTIONS, resolveModules, type AgencySectionKey } from "@/lib/agencySiteConfig";
import {
  CATALOG_CLASS_LABEL,
  MODULE_CATALOG,
  catalogEntry,
  type AgencyCatalogClass,
} from "@/lib/agencySiteCatalog";
import { resolveSiteProfile } from "@/lib/agencySiteProfile";
import { SITELAB_BASE, SITELAB_BASE_PATH, SITELAB_DEMO_HOSTNAME } from "@/lib/sitelabModels";
import {
  SITELAB_LOGO_MAX_BYTES,
  loadPresentation,
  resetPresentation,
  savePresentation,
  type SiteLabPresentation,
} from "@/lib/sitelabPresentation";

const GROUPS: AgencyCatalogClass[] = ["recomendada", "opcional", "especializada", "alternativa"];

/** Seções que dependem de integração externa e não aparecem no laboratório. */
const NEEDS_INTEGRATION: Partial<Record<AgencySectionKey, string>> = {
  avaliacoes: "Depende da integração com o Google; não aparece no laboratório.",
};

const EXTRA_INFO: Partial<Record<AgencySectionKey, { classification: AgencyCatalogClass; when: string }>> = {
  resorts: { classification: "especializada", when: "Mapa e lista de resorts no Brasil." },
  orlando: { classification: "especializada", when: "Ingressos de Orlando com solicitação em etapas." },
};

export default function SiteLabPresentationEditor() {
  const slug = SITELAB_BASE.slug;
  const labProfile = useMemo(() => resolveSiteProfile(SITELAB_DEMO_HOSTNAME), []);
  const [draft, setDraft] = useState<SiteLabPresentation>(() => loadPresentation(slug));
  const [saved, setSaved] = useState<"idle" | "ok" | "error">("idle");
  const [logoError, setLogoError] = useState<string | null>(null);

  const defaults = useMemo(() => {
    const out: Partial<Record<AgencySectionKey, boolean>> = {};
    for (const s of DEFAULT_SECTIONS) {
      const o = labProfile.sections?.[s.key];
      out[s.key] = typeof o === "boolean" ? o : typeof o === "object" ? o.enabled ?? s.enabled : s.enabled;
    }
    return out;
  }, [labProfile]);

  const rows = DEFAULT_SECTIONS.map((s) => {
    const entry = catalogEntry(s.key);
    const extra = EXTRA_INFO[s.key];
    return {
      key: s.key,
      name: entry?.name ?? s.label,
      when: entry?.when ?? extra?.when ?? "",
      classification: (entry?.classification ?? extra?.classification ?? "opcional") as AgencyCatalogClass,
    };
  });

  const modules = useMemo(() => resolveModules(undefined, labProfile.modules), [labProfile]);
  const moduleName = (key: string, fallback: string) =>
    MODULE_CATALOG.find((m) => m.key === key)?.name ?? fallback;

  const sectionOn = (k: AgencySectionKey) => draft.sections[k] ?? defaults[k] ?? false;
  const update = (patch: Partial<SiteLabPresentation>) => {
    setSaved("idle");
    setDraft((d) => ({ ...d, ...patch }));
  };
  const setIdentity = (key: keyof SiteLabPresentation["identity"], value: string) =>
    update({ identity: { ...draft.identity, [key]: value || undefined } });

  const onLogoFile = (file: File | undefined) => {
    setLogoError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setLogoError("Escolha um arquivo de imagem.");
    if (file.size > SITELAB_LOGO_MAX_BYTES) return setLogoError("Imagem muito grande (máx. 700 KB).");
    const reader = new FileReader();
    reader.onload = () => setIdentity("logoUrl", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const save = () => setSaved(savePresentation(slug, draft) ? "ok" : "error");
  const reset = () => {
    resetPresentation(slug);
    setDraft(loadPresentation(slug));
    setSaved("idle");
  };

  const color = (key: "primary" | "secondary" | "tertiary", label: string, fallback: string) => {
    const value = draft.identity[key] ?? fallback;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`sl-${key}`}>{label}</Label>
        <div className="flex items-center gap-2">
          <input
            id={`sl-${key}`}
            type="color"
            value={value}
            onChange={(e) => setIdentity(key, e.target.value)}
            className="h-10 w-12 cursor-pointer rounded border"
            aria-label={label}
          />
          <Input
            value={value}
            onChange={(e) => setIdentity(key, e.target.value)}
            className="font-mono"
            aria-label={`${label} (hex)`}
          />
        </div>
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8" data-testid="sitelab-presentation">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Apresentação para prospect</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o que aparece na home do laboratório e a identidade da agência que você vai
          apresentar. As escolhas ficam salvas neste navegador e não afetam nenhum site de cliente.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="text-lg font-semibold">Identidade da agência</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sl-name">Nome da agência</Label>
            <Input
              id="sl-name"
              value={draft.identity.name ?? ""}
              placeholder={SITELAB_BASE.name}
              onChange={(e) => setIdentity("name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sl-logo">Logotipo (arquivo ou endereço https)</Label>
            <Input id="sl-logo" type="file" accept="image/*" onChange={(e) => onLogoFile(e.target.files?.[0])} />
            <Input
              aria-label="Endereço do logotipo"
              placeholder="https://…"
              value={draft.identity.logoUrl?.startsWith("data:") ? "" : draft.identity.logoUrl ?? ""}
              onChange={(e) => setIdentity("logoUrl", e.target.value)}
            />
            {logoError ? <p className="text-sm text-destructive">{logoError}</p> : null}
            {draft.identity.logoUrl ? (
              <div className="flex items-center gap-3">
                <img src={draft.identity.logoUrl} alt="Prévia do logotipo" className="h-10 w-auto object-contain" />
                <Button type="button" size="sm" variant="ghost" onClick={() => setIdentity("logoUrl", "")}>
                  Remover
                </Button>
              </div>
            ) : null}
          </div>
          {color("primary", "Cor primária", SITELAB_BASE.palette.primary)}
          {color("secondary", "Cor secundária", SITELAB_BASE.palette.secondary)}
          {color("tertiary", "Cor terciária (fundos suaves)", SITELAB_BASE.palette.tertiary)}
        </div>
      </section>

      <section className="space-y-5 rounded-xl border p-5">
        <div>
          <h2 className="text-lg font-semibold">Seções da home</h2>
          <p className="text-sm text-muted-foreground">
            Abertura com banners, Central de Solicitações e rodapé aparecem sempre.
          </p>
        </div>
        {GROUPS.map((group) => {
          const list = rows.filter((r) => r.classification === group);
          if (!list.length) return null;
          return (
            <div key={group} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {CATALOG_CLASS_LABEL[group]}
              </h3>
              <ul className="divide-y rounded-lg border">
                {list.map((r) => (
                  <li key={r.key} className="flex items-start justify-between gap-4 p-3">
                    <div>
                      <Label htmlFor={`sec-${r.key}`} className="font-medium">{r.name}</Label>
                      <p className="text-xs text-muted-foreground">{NEEDS_INTEGRATION[r.key] ?? r.when}</p>
                    </div>
                    <Switch
                      id={`sec-${r.key}`}
                      data-testid={`sec-${r.key}`}
                      checked={sectionOn(r.key)}
                      onCheckedChange={(on) => update({ sections: { ...draft.sections, [r.key]: on } })}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="space-y-3 rounded-xl border p-5">
        <div>
          <h2 className="text-lg font-semibold">Temas da seção “Módulos temáticos”</h2>
          <p className="text-sm text-muted-foreground">Valem quando a seção de módulos está ligada.</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {modules.map((m) => (
            <li key={m.key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <Label htmlFor={`mod-${m.key}`}>{moduleName(m.key, m.title)}</Label>
              <Switch
                id={`mod-${m.key}`}
                checked={draft.modules[m.key] !== false}
                onCheckedChange={(on) => update({ modules: { ...draft.modules, [m.key]: on } })}
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t bg-background py-3">
        <Button onClick={save}>Salvar apresentação</Button>
        <Button variant="outline" asChild>
          <a href={SITELAB_BASE_PATH}>Ver a home</a>
        </Button>
        <Button variant="ghost" onClick={reset}>
          <RotateCcw className="mr-1 h-4 w-4" /> Restaurar padrão
        </Button>
        {saved === "ok" ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground" role="status">
            <Check className="h-4 w-4" /> Salvo
          </span>
        ) : saved === "error" ? (
          <span className="text-sm text-destructive" role="status">Não foi possível salvar neste navegador.</span>
        ) : null}
      </div>
    </main>
  );
}
