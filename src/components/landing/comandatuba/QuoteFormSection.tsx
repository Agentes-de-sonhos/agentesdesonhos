import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FORM, FORM_ANCHOR_ID, type AgencyConfig } from "./content";

function maskPhone(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  const d = digits;
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export type FormRef = {
  setInterestedCategory: (key: string, label: string) => void;
};

export function QuoteFormSection({
  agency,
  formRef,
}: {
  agency: AgencyConfig;
  formRef: React.MutableRefObject<FormRef | null>;
}) {
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [origin, setOrigin] = useState("");
  const [period, setPeriod] = useState("");
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [kidsAges, setKidsAges] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const submittingRef = useRef(false);

  useMemo(() => {
    formRef.current = {
      setInterestedCategory: (_key: string, label: string) => {
        setCategory(label);
      },
    };
  }, [formRef]);

  const utm = useMemo(
    () => ({
      utm_source: params.get("utm_source") ?? "",
      utm_medium: params.get("utm_medium") ?? "",
      utm_campaign: params.get("utm_campaign") ?? "",
      utm_content: params.get("utm_content") ?? "",
      utm_term: params.get("utm_term") ?? "",
    }),
    [params]
  );

  useEffect(() => {
    // no-op; kept for future integrations (pixels, gtag, etc.)
  }, []);

  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const whatsappValid = whatsapp.replace(/\D/g, "").length >= 10;
  const nameValid = name.trim().length >= 2;
  const valid = nameValid && whatsappValid && emailValid && consent;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!valid) {
      toast.error("Preencha os campos obrigatórios para enviar.");
      return;
    }
    submittingRef.current = true;
    setLoading(true);

    const payload = {
      name,
      whatsapp,
      email,
      origin,
      period,
      adults,
      kids,
      kidsAges,
      category,
      notes,
      // hidden tracking
      destination: "Transamerica Comandatuba",
      landing: "transamerica-comandatuba",
      agency: agency.name,
      consultant: agency.consultantName,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      ...utm,
    };

    try {
      // Same posture as the Orlando Magic demo: this form is prepared for
      // the lead-distribution integration and stores the payload locally.
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.info("[comandatuba lead]", payload);
        try {
          const bucket = JSON.parse(localStorage.getItem("comandatuba_leads") || "[]");
          bucket.push({ ...payload, at: new Date().toISOString() });
          localStorage.setItem("comandatuba_leads", JSON.stringify(bucket));
        } catch {
          /* ignore */
        }
      }
      setSent(true);
      toast.success(FORM.success);
    } catch {
      toast.error(FORM.errorGeneric);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <section id={FORM_ANCHOR_ID} className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-[26px] font-bold leading-tight text-slate-900 sm:text-[32px]">
            {FORM.title}
          </h2>
          <p className="mt-2 text-[15px] text-slate-600">{FORM.subtitle}</p>
        </div>

        {sent ? (
          <div className="mt-8 rounded-2xl border p-6 text-center" style={{ borderColor: `${agency.primaryColor}55`, backgroundColor: `${agency.primaryColor}0d` }}>
            <p className="font-display text-[18px] font-semibold text-slate-900">{FORM.success}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" noValidate>
            <Field label="Nome completo" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
                autoComplete="name"
              />
            </Field>
            <Field label="WhatsApp" required>
              <input
                type="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                required
                className="input"
                autoComplete="tel"
              />
            </Field>
            <Field label="E-mail (opcional)">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="email"
              />
            </Field>
            <Field label="Cidade ou aeroporto de saída">
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="input"
                placeholder="Ex.: São Paulo"
              />
            </Field>
            <Field label="Mês ou período desejado">
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input"
                placeholder="Ex.: Janeiro de 2027"
              />
            </Field>
            <Field label="Categoria de interesse">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                <option value="">Sem preferência</option>
                <option value="Apartamentos">Apartamentos</option>
                <option value="Suítes">Suítes</option>
                <option value="Bangalôs">Bangalôs</option>
              </select>
            </Field>
            <Field label="Quantidade de adultos">
              <input
                type="number"
                min={1}
                value={adults}
                onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))}
                className="input"
              />
            </Field>
            <Field label="Quantidade de crianças">
              <input
                type="number"
                min={0}
                value={kids}
                onChange={(e) => setKids(Math.max(0, Number(e.target.value) || 0))}
                className="input"
              />
            </Field>
            {kids > 0 && (
              <Field label="Idade das crianças">
                <input
                  type="text"
                  value={kidsAges}
                  onChange={(e) => setKidsAges(e.target.value)}
                  className="input"
                  placeholder="Ex.: 5 e 10 anos"
                />
              </Field>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Observações">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input min-h-[90px]"
                  rows={3}
                />
              </Field>
            </div>

            <label className="sm:col-span-2 lg:col-span-3 flex items-start gap-2 text-[13px] text-slate-600">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4"
                required
              />
              <span>{FORM.consent}</span>
            </label>

            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={loading || !valid}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl px-6 text-[14px] font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: agency.primaryColor }}
              >
                {loading ? "Enviando..." : FORM.submit}
              </button>
              <p className="mt-3 text-center text-[12px] text-slate-500">{FORM.privacy}</p>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.65rem 0.85rem;
          font-size: 14px;
          color: rgb(15 23 42);
          transition: border-color .15s, box-shadow .15s;
        }
        .input:focus { outline: none; border-color: ${agency.primaryColor}; box-shadow: 0 0 0 3px ${agency.primaryColor}25; }
        select.input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2394a3b8' d='M6 8L0 0h12z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.85rem center; padding-right: 2rem; }
      `}</style>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-[13px] font-medium text-slate-700">
      <span className="mb-1.5 block">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}