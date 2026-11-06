import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./cruiseShipPage.css";
import type { CruiseShipContent } from "@/lib/cruiseShips/types";
import { buildItineraryGroups, dateLabel, variantCalls, variantMonths, type ItineraryGroup } from "@/lib/cruiseShips/itineraryGroups";
import { cruiseQuotePayload, HELP_LABEL, validCruiseQuote, type CruiseQuoteForm } from "@/lib/cruiseShips/quoteRequest";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { Input } from "@/components/ui/input";
import { agencySiteHref } from "@/lib/agencyContextLink";

/**
 * Shared cruise ship page (approved Harmony layout). Rendered INSIDE the
 * agency's own AgencySiteLayout (header/footer untouched); every style is
 * scoped under `.csp`. Agency colors come from the layout's --brand-* tokens.
 */
const PlayIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14l11-7z" /></svg>;

/**
 * Agency palette from the site's own theme tokens (preset themes expose HSL
 * tokens; custom brands also set --brand-*). Nav/titles use the agency ink so
 * contrast stays readable whatever the accent color is.
 */
const brandVars = {
  "--agency-primary": "hsl(var(--primary, 183 55% 29%))",
  "--agency-on-primary": "hsl(var(--primary-foreground, 0 0% 100%))",
  "--agency-secondary": "hsl(var(--wl-ink, var(--foreground, 200 51% 16%)))",
  "--agency-on-secondary": "#fff",
  "--agency-surface": "var(--brand-tertiary, hsl(var(--wl-sand, var(--secondary, 40 23% 95%))))",
} as CSSProperties;

const maskPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  const local = digits.slice(2);
  const split = local.length > 8 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${local.slice(0, split)}${local.length > split ? `-${local.slice(split)}` : ""}`;
};

const emptyForm = (): CruiseQuoteForm => ({ name: "", phone: "", email: "", period: "", adults: 2, children: 0, ages: "", cabin: "", consent: false });

function openDialog(d: HTMLDialogElement | null) { if (d && !d.open) { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); } }
function closeDialog(d: HTMLDialogElement | null) { if (d) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } }

export function CruiseShipPage({ ship, hostname }: { ship: CruiseShipContent; hostname: string }) {
  const A = ship.assets;
  const img = (k: string) => A[k] ?? "";
  const rootRef = useRef<HTMLDivElement>(null);

  // DM Sans (approved sans-serif), loaded once without a global @import.
  useEffect(() => {
    const id = "csp-dm-sans";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  // Sticky section nav sits right below the agency's own sticky/fixed header.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;
    const measure = () => {
      const header = [...document.querySelectorAll("header")].find((h) => ["sticky", "fixed"].includes(getComputedStyle(h).position));
      root.style.setProperty("--csp-sticky-top", `${header ? Math.round(header.getBoundingClientRect().height) : 0}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* ---------------- Gallery / video / album ---------------- */
  const galleryRef = useRef<HTMLDialogElement>(null);
  const albumRef = useRef<HTMLDialogElement>(null);
  const techRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pic, setPic] = useState(0); // -1 = video
  const [videoError, setVideoError] = useState(false);
  const [category, setCategory] = useState("Todas");
  const photos = ship.photos;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause?.();
    if (pic === -1 && galleryRef.current?.open) v.play?.()?.catch?.(() => {});
  }, [pic]);

  const show = useCallback((index: number) => { setVideoError(false); setPic(index); openDialog(galleryRef.current); if (index === -1) videoRef.current?.play?.()?.catch?.(() => {}); }, []);
  const openPhoto = useCallback((key: string) => { const i = photos.findIndex((p) => p.key === key); if (i >= 0) show(i); }, [photos, show]);
  const prev = () => setPic((p) => (p === -1 ? photos.length - 1 : p - 1));
  const next = () => setPic((p) => (p === photos.length - 1 ? -1 : p + 1));
  const backdropClose = (e: React.MouseEvent<HTMLDialogElement>) => { if (e.target === e.currentTarget) closeDialog(e.currentTarget); };

  /* ---------------- Experiences ---------------- */
  const [tab, setTab] = useState(ship.experiences.tabs[0].key);
  const exp = ship.experiences.tabs.find((t) => t.key === tab)!;

  /* ---------------- Itineraries ---------------- */
  const groups = useMemo(() => buildItineraryGroups(ship.routes.feed.sailings, ship.routes), [ship]);
  const [region, setRegion] = useState(ship.routes.regions[0]);
  const nightsOptions = useMemo(() => [...new Set(groups.filter((g) => g.region === region).map((g) => g.n))].sort((a, b) => a - b), [groups, region]);
  const [nights, setNights] = useState<number>(nightsOptions[0]);
  const combos = useMemo(() => groups.filter((g) => g.region === region && g.n === nights), [groups, region, nights]);
  const [comboId, setComboId] = useState<string>(combos[0]?.id ?? "");
  const [order, setOrder] = useState(0);
  useEffect(() => { setNights(nightsOptions[0]); }, [nightsOptions]);
  useEffect(() => { setComboId(combos[0]?.id ?? ""); }, [combos]);
  useEffect(() => { setOrder(0); }, [comboId]);
  const group = groups.find((g) => g.id === comboId) ?? null;
  const variant = group?.variants[order] ?? group?.variants[0] ?? null;
  const months = variant ? variantMonths(variant) : [];

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [mapStatus, setMapStatus] = useState("");
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!mapEl.current || typeof window === "undefined") return;
    import("leaflet").then((mod) => {
      const L = (mod as unknown as { default?: typeof import("leaflet") }).default ?? mod;
      if (cancelled || !mapEl.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapEl.current, { scrollWheelZoom: false, minZoom: 3, maxZoom: 9 });
      map.attributionControl.setPrefix("Leaflet");
      map.attributionControl.addAttribution("Geografia: Natural Earth");
      mapRef.current = map;
      setMapReady(true);
      fetch(ship.routes.geography).then((r) => r.json()).then((data) => {
        if (cancelled) return;
        L.geoJSON(data, { style: { color: "#afc3c0", weight: 1, fillColor: "#f8f7f1", fillOpacity: 1 }, interactive: false }).addTo(map).bringToBack();
      }).catch(() => setMapStatus("Não foi possível carregar a base geográfica."));
    }).catch(() => setMapStatus("Não foi possível carregar a base geográfica."));
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [ship]);

  useEffect(() => {
    const L = leafletRef.current, map = mapRef.current;
    if (!L || !map || !variant) return;
    const color = (rootRef.current && getComputedStyle(rootRef.current).getPropertyValue("--teal").trim()) || "#216d73";
    layerRef.current?.remove();
    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;
    const points = variant.ports.map((p) => ship.routes.coordinates[p]).filter(Boolean) as [number, number][];
    L.polyline(points, { color, weight: 2, dashArray: "5 8", opacity: 0.65 }).addTo(layer);
    [...new Set(variant.ports)].forEach((p, i) => {
      const c = ship.routes.coordinates[p];
      if (!c) return;
      L.circleMarker(c, { radius: 6, color, fillColor: "#fff", fillOpacity: 1, weight: 2 }).addTo(layer)
        .bindTooltip(p, { permanent: true, direction: i === 0 ? "top" : "right", offset: [8, 0], className: "port-label" });
    });
    map.invalidateSize();
    if (points.length) map.fitBounds(points, { paddingTopLeft: [65, 55], paddingBottomRight: [100, 40], maxZoom: 7 });
  }, [variant, mapReady, ship]);

  /* ---------------- Sticky nav ---------------- */
  const [active, setActive] = useState("csp-sobre");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !rootRef.current) return;
    const obs = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: "-15% 0px -65% 0px" });
    rootRef.current.querySelectorAll("section[id]").forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);
  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    rootRef.current?.querySelector(`#${id}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  /* ---------------- Quote (real CRM flow) ---------------- */
  const { state, error, submit, reset } = useAgencySiteRequest(hostname);
  const [form, setForm] = useState<CruiseQuoteForm>(emptyForm);
  const [travelMonth, setTravelMonth] = useState("");
  const [travelYear, setTravelYear] = useState("");
  const [undecided, setUndecided] = useState(false);
  const currentYear = new Date().getFullYear();
  const travelYears = Array.from({ length: 5 }, (_, i) => currentYear + i);
  const monthLabels = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const childAges = form.children ? form.ages.split(",") : [];
  const changeChildren = (raw: string) => {
    const count = Math.min(10, Math.max(0, Math.floor(Number(raw) || 0)));
    setForm(f => ({ ...f, children: count, ages: Array.from({ length: count }, (_, i) => f.ages.split(",")[i] ?? "").join(",") }));
  };
  const changeChildAge = (index: number, value: string) => {
    setForm(f => {
      const ages = Array.from({ length: f.children }, (_, i) => f.ages.split(",")[i] ?? "");
      ages[index] = value;
      return { ...f, ages: ages.join(",") };
    });
  };
  const changeTravelPeriod = (month: string, year: string) => {
    setTravelMonth(month); setTravelYear(year);
    setForm(f => ({ ...f, period: month && year ? year + "-" + month : "" }));
  };
  const [routeChoice, setRouteChoice] = useState<string>("");
  const [routeVariant, setRouteVariant] = useState<number | null>(null);
  const [routeDate, setRouteDate] = useState<string>("");
  const [honeypot, setHoneypot] = useState("");
  const inFlight = useRef(false);
  const presentation = hostname.endsWith(".preview.local") || hostname.endsWith(".demo.local");
  const chosenGroup: ItineraryGroup | null = groups.find((g) => g.id === routeChoice) ?? null;
  const dateOptions = chosenGroup
    ? (routeVariant != null ? chosenGroup.variants[routeVariant]?.sailings ?? [] : chosenGroup.variants.flatMap((v) => v.sailings))
        .map((s) => s.date).sort()
    : [];
  const change = <K extends keyof CruiseQuoteForm>(k: K, v: CruiseQuoteForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = (undecided || (!travelMonth && !travelYear) || (!!travelMonth && !!travelYear)) && validCruiseQuote(form) && state !== "submitting" && !presentation;

  const quoteThisRoute = () => {
    if (!group) return;
    setRouteChoice(group.id); setRouteVariant(order); setRouteDate("");
    if (state === "success" || state === "error") reset();
    rootRef.current?.querySelector("#csp-orcamento")?.scrollIntoView?.({ behavior: "smooth" });
  };
  const chooseCabin = (name: string) => { change("cabin", name); rootRef.current?.querySelector("#csp-orcamento")?.scrollIntoView?.({ behavior: "smooth" }); };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || inFlight.current) return;
    inFlight.current = true;
    try {
      await submit(cruiseQuotePayload(ship, { group: chosenGroup, variantIndex: chosenGroup ? routeVariant : null, date: routeDate || null }, form, honeypot));
    } finally { inFlight.current = false; }
  };
  const newRequest = () => { setForm(emptyForm()); setTravelMonth(""); setTravelYear(""); setUndecided(false); setRouteChoice(""); setRouteVariant(null); setRouteDate(""); reset(); };

  const cur = pic >= 0 ? photos[pic] : null;
  const anchors: [string, string][] = [["csp-sobre", "O navio"], ["csp-experiencia", "Experiências"], ["csp-cabines", "Cabines"], ["csp-roteiros", "Roteiros"]];

  return (
    <div className="csp" ref={rootRef} style={brandVars} data-testid="cruise-ship-page">
      <main>
        <div className="intro">
          <div className="eyebrow">{ship.eyebrow}</div>
          <div className="title-row">
            <div><h1>{ship.titleLead} <em>{ship.titleTail}</em></h1><p>{ship.tagline}</p></div>
            <a className="textlink" href="#csp-roteiros" onClick={scrollTo("csp-roteiros")}>Conhecer os roteiros ↓</a>
          </div>
        </div>

        <div className="gallery">
          <button className="main-photo" aria-label={ship.hero.videoAria} onClick={() => show(-1)}>
            <img src={img(ship.hero.image)} alt={ship.hero.alt} />
            <span className="play-badge" aria-hidden="true"><PlayIcon /></span>
            <span className="photo-caption">{ship.hero.caption}<small>{ship.hero.captionSmall}</small></span>
          </button>
          {ship.tiles.map((t) => (
            <button key={t.photo} onClick={() => openPhoto(t.photo)}><img src={img(t.photo)} alt={t.alt} /><span>{t.label}</span></button>
          ))}
          <button className="last-photo" onClick={() => { setCategory("Todas"); openDialog(albumRef.current); }}>
            <img src={img(ship.albumTile.image)} alt={ship.albumTile.alt} /><span>⊞ Ver todas as {photos.length} fotos</span>
          </button>
        </div>
        <div className="media-line media-credit"><span>{ship.credit}</span></div>

        <nav className="anchors" aria-label="Seções">
          {anchors.map(([id, label]) => <a key={id} href={`#${id}`} className={active === id ? "active" : undefined} onClick={scrollTo(id)}>{label}</a>)}
          <a href="#csp-orcamento" className="nav-quote" onClick={scrollTo("csp-orcamento")}>Solicitar orçamento ↗</a>
        </nav>

        <section id="csp-sobre">
          <div className="section-head"><div><div className="eyebrow">{ship.about.eyebrow}</div><h2>{ship.about.titleA}<br /><em>{ship.about.titleB}</em></h2></div><p>{ship.about.text}</p></div>
          <div className="stats">{ship.about.stats.map((s) => <div key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}</div>
          <div className="tech-entry"><div><strong>{ship.about.techTitle}</strong><p>{ship.about.techText}</p></div><button className="button" aria-haspopup="dialog" onClick={() => openDialog(techRef.current)}>{ship.about.techButton}</button></div>
          <div className="why">{ship.about.why.map((w, i) => <div key={w.title}><span className="number">{String(i + 1).padStart(2, "0")}</span><h3>{w.title}</h3><p>{w.text}</p></div>)}</div>
        </section>

        <section id="csp-experiencia">
          <div className="eyebrow">{ship.experiences.eyebrow}</div>
          <h2>{ship.experiences.titleA}<em>{ship.experiences.titleB}</em></h2>
          <div className="tabs" role="tablist" aria-label="Experiências">
            {ship.experiences.tabs.map((t) => <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>)}
          </div>
          <div className="experience-panel" role="tabpanel">
            <img src={img(exp.image)} alt={exp.title} />
            <div className="panel-copy"><div className="eyebrow">{ship.shipName.toUpperCase()}</div><h3>{exp.title}</h3><p>{exp.text}</p><ul>{exp.items.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
          <div className="included" aria-labelledby="includedTitle">
            <h3 id="includedTitle" className="included-title">{ship.included.title}</h3>
            <div className="included-grid">{ship.included.items.map((it) => <div key={it.title}><h3>{it.title}</h3><p>{it.text}</p></div>)}</div>
          </div>
        </section>

        <section id="csp-cabines">
          <div className="section-head"><div><div className="eyebrow">{ship.cabins.eyebrow}</div><h2>{ship.cabins.titleA}<em>{ship.cabins.titleB}</em></h2></div><p>{ship.cabins.text}</p></div>
          <div className="cabin-grid">
            {ship.cabins.items.map((c) => (
              <article className="cabin" key={c.name}>
                <div className="cabin-visual"><img loading="lazy" src={img(c.image)} alt={`Imagem ilustrativa da categoria ${c.name}`} /></div>
                <div className="cabin-copy"><h3>{c.name}</h3><p>{c.lead}</p><details><summary>Conhecer a categoria +</summary><p>{c.detail}</p></details><button onClick={() => chooseCabin(c.name)}>Tenho interesse ↗</button></div>
              </article>
            ))}
          </div>
          <p className="note">{ship.cabins.note}</p>
        </section>

        <section id="csp-roteiros">
          <div className="section-head route-section-head"><div><div className="eyebrow">{ship.routes.eyebrow}</div><h2>{ship.routes.titleA}<em>{ship.routes.titleB}</em></h2></div><p>{ship.routes.text}</p></div>
          <div className="route-intro"><span>⌖ MAPA DOS ITINERÁRIOS</span></div>
          <div className="route-tabs" role="tablist" aria-label="Tipos de roteiro">
            {ship.routes.regions.map((r) => (
              <button key={r} role="tab" aria-selected={region === r} className={region === r ? "active" : undefined} onClick={() => setRegion(r)}>
                <span>{r}</span><small>{groups.filter((g) => g.region === r).length} combinações de duração e destinos</small>
              </button>
            ))}
          </div>
          <div className="route-selectors">
            <label>Duração<select aria-label="Duração" value={nights} onChange={(e) => setNights(Number(e.target.value))}>{nightsOptions.map((n) => <option key={n} value={n}>{n} noites</option>)}</select></label>
            <label>Destinos<select aria-label="Destinos" value={comboId} onChange={(e) => setComboId(e.target.value)}>{combos.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
            <label id="orderLabel" hidden={!group || group.variants.length === 1}>Ordem das escalas<select aria-label="Ordem das escalas" value={order} onChange={(e) => setOrder(Number(e.target.value))}>{group?.variants.map((v, i) => <option key={i} value={i}>{variantCalls(v)}</option>)}</select></label>
          </div>
          <div className="route-explorer">
            <div className="map-wrapper">
              <div id="itineraryMap" ref={mapEl} role="region" aria-label={group && variant ? `Mapa: ${group.region} · ${group.n} noites · ${variantCalls(variant)}` : "Mapa das escalas do roteiro selecionado"} />
              <p className="note" aria-live="polite">{mapStatus}</p>
              <div className="map-legend"><span>● Portos e destinos</span><span>┄ Ligação esquemática entre escalas</span></div>
            </div>
            <div className="route-details" role="tabpanel" aria-live="polite" data-testid="route-details">
              {group && variant && (<>
                <div className="eyebrow">{group.n} NOITES · {ship.routes.homePortEyebrow}</div>
                <h3>{group.title}</h3>
                <p>{ship.routes.homePortText}</p>
                <div className="route-months"><strong>Meses com saídas encontradas</strong><p>{months.join(" · ")}</p></div>
                <ol className="day-list">{variant.ports.map((p, i) => <li key={`${p}-${i}`}><span>{i === 0 ? "Início" : i === variant.ports.length - 1 ? "Fim" : i}</span><b>{p}</b></li>)}</ol>
                <p className="note">Sequência de portos. Dias de navegação não estão representados nesta lista.</p>
                <button className="button" onClick={quoteThisRoute}>Quero orçamento deste roteiro</button>
                <details className="variant-note"><summary>Datas desta opção +</summary><p>{variant.sailings.map((s) => dateLabel(s.date)).join(" · ")}</p><p>Consulte a agência para confirmar as escalas e a disponibilidade no período desejado.</p></details>
              </>)}
            </div>
          </div>
          <div className="map-explanation"><strong>Como ler este mapa</strong><p>Os pontos indicam a localização aproximada dos destinos. As linhas mostram somente a sequência das escalas: <strong>não são o trajeto marítimo real</strong> e podem cruzar áreas de terra. O terminal exato, os dias de navegação e a ordem das paradas dependem da saída escolhida.</p></div>
          <p className="note">Não é inventário completo nem consulta de disponibilidade em tempo real.</p>
        </section>

        <section id="csp-orcamento" className="quote">
          <div>
            <div className="eyebrow">{ship.quote.eyebrow}</div>
            <h2>{ship.quote.titleA}<br /><em>{ship.quote.titleB}</em></h2>
            <p>{ship.quote.textA}<br />{ship.quote.textB}</p>
            <div className="quote-ship">{ship.shipName}<br /><small>{ship.lineName}</small></div>
          </div>
          {state === "success" ? (
            <div role="status" className="csp-success">
              <h3>Solicitação enviada com sucesso.</h3>
              <p>Recebemos seu pedido de orçamento para o {ship.shipName}. A agência entrará em contato com você em breve.</p>
              <button type="button" className="button" onClick={newRequest}>Fazer outra solicitação</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate={false} aria-label="Solicitar orçamento">
              <fieldset disabled={state === "submitting"} className="csp-fieldset">
                <div className="form-grid">
                  <label>Nome completo<Input name="nome" autoComplete="name" required maxLength={200} placeholder="Digite seu nome completo" value={form.name} onChange={(e) => change("name", e.target.value)} /></label>
                  <label>WhatsApp com DDD<Input name="telefone" type="tel" autoComplete="tel-national" required placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => change("phone", maskPhone(e.target.value))} /></label>
                  <label>E-mail (opcional)<input name="email" type="email" autoComplete="email" maxLength={200} value={form.email} onChange={(e) => change("email", e.target.value)} /></label>
                  <div className="csp-travel-period">
                    <span className="csp-field-label">Quando deseja viajar?</span>
                    <div className="csp-period-grid">
                      <select aria-label="Mês da viagem" value={travelMonth} disabled={undecided} onChange={e => changeTravelPeriod(e.target.value, travelYear)}>
                        <option value="">Selecione o mês</option>
                        {monthLabels.map((m, i) => <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
                      </select>
                      <select aria-label="Ano da viagem" value={travelYear} disabled={undecided} onChange={e => changeTravelPeriod(travelMonth, e.target.value)}>
                        <option value="">Selecione o ano</option>
                        {travelYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <label className="csp-undecided"><input type="checkbox" checked={undecided} onChange={e => { setUndecided(e.target.checked); if (e.target.checked) changeTravelPeriod("", ""); }} />Ainda não decidi</label>
                    {!undecided && (!!travelMonth !== !!travelYear) && <p className="note">Selecione o mês e o ano.</p>}
                  </div>
                  <label>Roteiro de interesse<select name="roteiro" value={routeChoice} onChange={(e) => { setRouteChoice(e.target.value); setRouteVariant(null); setRouteDate(""); }}>
                    <option value="">{HELP_LABEL}</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.region} · {g.n} noites · {g.title}</option>)}
                  </select></label>
                  {chosenGroup && chosenGroup.variants.length > 1 && (
                    <label>Ordem das escalas<select name="ordem" value={routeVariant ?? ""} onChange={(e) => { setRouteVariant(e.target.value === "" ? null : Number(e.target.value)); setRouteDate(""); }}>
                      <option value="">Qualquer ordem</option>
                      {chosenGroup.variants.map((v, i) => <option key={i} value={i}>{variantCalls(v)}</option>)}
                    </select></label>
                  )}
                  {chosenGroup && (
                    <label>Data de saída<select name="data" value={routeDate} onChange={(e) => setRouteDate(e.target.value)}>
                      <option value="">Qualquer data desta opção</option>
                      {dateOptions.map((d) => <option key={d} value={d}>{dateLabel(d)}</option>)}
                    </select></label>
                  )}
                  <label>Adultos<input type="number" min={1} max={20} name="adultos" required value={form.adults} onChange={(e) => change("adults", Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>
                  <label>Crianças<input type="number" min={0} max={10} name="criancas" required value={form.children} onChange={(e) => changeChildren(e.target.value)} /></label>
                  <label>Preferência de cabine<select name="cabine" value={form.cabin} onChange={(e) => change("cabin", e.target.value)}>
                    <option value="">{HELP_LABEL}</option>
                    {ship.cabins.items.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select></label>
                  {form.children > 0 && <div className="csp-child-ages">
                    <p>Idade das crianças na data da viagem</p>
                    <div className="csp-age-grid">{Array.from({ length: form.children }, (_, i) => (
                      <label key={i}>Criança {i + 1}<select name={`idade_crianca_${i + 1}`} required value={childAges[i] ?? ""} onChange={e => changeChildAge(i, e.target.value)}>
                        <option value="">Selecione a idade</option>
                        <option value="0">Menos de 1 ano</option>
                        {Array.from({ length: 17 }, (_, age) => age + 1).map(age => <option key={age} value={age}>{age} {age === 1 ? "ano" : "anos"}</option>)}
                      </select></label>
                    ))}</div>
                  </div>}
                </div>
                <div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></div>
                <label className="csp-consent"><input type="checkbox" checked={form.consent} onChange={(e) => change("consent", e.target.checked)} /><span>Concordo com o envio dos meus dados para que a agência entre em contato comigo sobre este orçamento, conforme a <a href={agencySiteHref("/politicasdeprivacidade")}>Política de Privacidade</a>.</span></label>
              </fieldset>
              <button className="button" type="submit" disabled={!canSubmit}>{state === "submitting" ? "Enviando…" : "Solicite o seu orçamento"}</button>
              {presentation && <p className="note" role="status">Apresentação: nenhum dado será enviado.</p>}
              {state === "error" && error && <p role="alert" className="csp-error">{error} Revise os dados e toque em “Solicite o seu orçamento” para tentar de novo.</p>}
            </form>
          )}
        </section>
      </main>

      <dialog ref={techRef} id="techDialog" aria-labelledby="techTitle" onClick={backdropClose}>
        <button className="close" aria-label="Fechar ficha técnica" onClick={() => closeDialog(techRef.current)}>×</button>
        <div className="eyebrow">{ship.shipName.toUpperCase()}</div>
        <h2 id="techTitle">{ship.tech.title}</h2>
        <div className="tech-content"><p><strong>{ship.tech.paragraphs[0]}</strong>{ship.tech.paragraphs.slice(1).map((p) => <span key={p}><br />{p}</span>)}</p></div>
      </dialog>

      <a className="mobile-cta button" href="#csp-orcamento" onClick={scrollTo("csp-orcamento")}>Solicitar orçamento ↗</a>

      <dialog ref={albumRef} id="albumDialog" aria-labelledby="albumTitle" onClick={backdropClose}>
        <button className="close" aria-label="Fechar álbum" onClick={() => closeDialog(albumRef.current)}>×</button>
        <div className="eyebrow">{ship.shipName.toUpperCase()}</div>
        <h2 id="albumTitle">Conheça cada ambiente.</h2>
        <p>Uma seleção de <span className="photo-count">{photos.length}</span> fotos para explorar com calma.</p>
        <div className="album-filters" role="group" aria-label="Filtrar fotos por ambiente">
          {ship.photoCategories.map((c) => <button key={c} className={category === c ? "active" : undefined} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}
        </div>
        <div className="album-grid">
          {photos.filter((p) => category === "Todas" || p.category === category).map((p) => (
            <button key={p.key} onClick={() => openPhoto(p.key)}><img loading="lazy" src={img(p.key)} alt={p.label} /><span>{p.label}</span></button>
          ))}
        </div>
      </dialog>

      <dialog ref={galleryRef} id="galleryDialog" aria-label={`Vídeo e fotos do ${ship.shipName}`} onClick={backdropClose}
        onClose={() => videoRef.current?.pause?.()}
        onKeyDown={(e) => { if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); }}>
        <button className="close" aria-label="Fechar galeria" onClick={() => closeDialog(galleryRef.current)}>×</button>
        <video id="shipVideo" ref={videoRef} hidden={pic !== -1} preload="none" controls playsInline poster={img(ship.hero.image)} onError={() => setVideoError(true)}>
          <source src={img(ship.hero.video)} type="video/mp4" />
        </video>
        <img id="largePhoto" hidden={pic === -1} src={cur ? img(cur.key) : undefined} alt={cur?.label ?? ""} />
        <p id="videoError" hidden={!videoError}>Não foi possível reproduzir o vídeo. Tente novamente em instantes.</p>
        <div className="dialog-bottom">
          <button aria-label="Foto anterior" onClick={prev}>←</button>
          <span>{pic === -1 ? `Vídeo do navio · 1 / ${photos.length + 1}` : `Foto ${pic + 1} / ${photos.length} · ${cur?.label}`}</span>
          <button aria-label="Próxima foto" onClick={next}>→</button>
        </div>
        <div className="lightbox-thumbs">
          <button aria-label="Assistir ao vídeo" className={`video-thumb${pic === -1 ? " active" : ""}`} aria-pressed={pic === -1} onClick={() => setPic(-1)}><PlayIcon /></button>
          {photos.map((p, i) => <button key={p.key} aria-label={`Ver ${p.label}`} className={pic === i ? "active" : undefined} aria-pressed={pic === i} onClick={() => setPic(i)}><img loading="lazy" src={img(p.key)} alt="" /></button>)}
        </div>
      </dialog>
    </div>
  );
}

export default CruiseShipPage;
