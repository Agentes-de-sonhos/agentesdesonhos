import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { BrandText } from "@/components/ui/brand-text";
import logoTravelMeet from "@/assets/logo-travelmeet.png";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  type Lang,
  t,
  getStoredLang,
  setStoredLang,
  CATEGORY_KEYS,
  CATEGORY_DB_VALUES,
} from "@/i18n/cadastroFornecedor";

export default function CadastroFornecedor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState<Lang>(getStoredLang);
  const [form, setForm] = useState({
    company_name: "",
    category: "",
    email: "",
    password: "",
    password_confirm: "",
    responsible_name: "",
    phone: "",
  });

  const changeLang = (l: Lang) => {
    setLang(l);
    setStoredLang(l);
  };

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.company_name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.responsible_name.trim() ||
      !form.category
    ) {
      toast.error(t(lang, "err_required"));
      return;
    }

    if (form.password.length < 6) {
      toast.error(t(lang, "err_password_length"));
      return;
    }

    if (form.password !== form.password_confirm) {
      toast.error(t(lang, "err_password_mismatch"));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "supplier-register",
        {
          body: {
            company_name: form.company_name.trim(),
            category: CATEGORY_DB_VALUES[form.category] || form.category || null,
            email: form.email.trim().toLowerCase(),
            password: form.password,
            responsible_name: form.responsible_name.trim(),
            phone: form.phone.trim() || null,
          },
        }
      );

      if (error) {
        let msg = t(lang, "err_create");
        try {
          const body =
            typeof error.context === "object" && error.context?.body
              ? JSON.parse(
                  new TextDecoder().decode(
                    await new Response(error.context.body).arrayBuffer()
                  )
                )
              : null;
          if (body?.error) msg = body.error;
        } catch {}
        toast.error(msg);
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (signInError) {
        toast.error(t(lang, "success_created"));
        navigate("/auth");
        return;
      }

      toast.success(t(lang, "success_submitted"));
      navigate("/meu-perfil-empresa");
    } catch {
      toast.error(t(lang, "err_generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Language selector - top right on all screens */}
        <div className="flex justify-end mb-4">
          <LanguageSelector value={lang} onChange={changeLang} />
        </div>

        {/* Logo - centered */}
        <div className="flex justify-center mb-8">
          <BrandText>
            <img
              src={logoTravelMeet}
              alt="TravelMeet"
              className="h-30 w-auto"
            />
          </BrandText>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {t(lang, "page_title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t(lang, "page_subtitle")}
          </p>
        </div>

        {/* Guia de Turismo CTA */}
        <div className="mb-6 rounded-2xl border border-border bg-card/60 p-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-medium text-foreground">É um Guia de Turismo?</p>
            <p className="text-muted-foreground text-xs">Use o formulário específico para guias.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("/cadastro-guia")} className="rounded-xl shrink-0">
            Cadastrar como Guia
          </Button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-lg"
        >
          {/* Company Name */}
          <div>
            <Label>
              {t(lang, "company_name")} {t(lang, "required")}
            </Label>
            <Input
              value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              placeholder={t(lang, "company_name_placeholder")}
              className="mt-1 rounded-xl"
              required
            />
          </div>

          {/* Category */}
          <div>
            <Label>
              {t(lang, "category")} {t(lang, "required")}
            </Label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="">{t(lang, "category_placeholder")}</option>
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(lang, key)}
                </option>
              ))}
            </select>
          </div>

          {/* Responsible */}
          <div>
            <Label>
              {t(lang, "responsible_name")} {t(lang, "required")}
            </Label>
            <Input
              value={form.responsible_name}
              onChange={(e) => update("responsible_name", e.target.value)}
              placeholder={t(lang, "responsible_name_placeholder")}
              className="mt-1 rounded-xl"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <Label>{t(lang, "phone")}</Label>
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder={t(lang, "phone_placeholder")}
              className="mt-1 rounded-xl"
            />
          </div>

          {/* Email */}
          <div>
            <Label>
              {t(lang, "email")} {t(lang, "required")}
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder={t(lang, "email_placeholder")}
              className="mt-1 rounded-xl"
              required
            />
          </div>

          {/* Password */}
          <div>
            <Label>
              {t(lang, "password")} {t(lang, "required")}
            </Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder={t(lang, "password_placeholder")}
                className="rounded-xl pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <Label>
              {t(lang, "password_confirm")} {t(lang, "required")}
            </Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password_confirm}
                onChange={(e) => update("password_confirm", e.target.value)}
                placeholder={t(lang, "password_confirm_placeholder")}
                className="rounded-xl pr-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl h-12 text-base"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            {t(lang, "submit")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t(lang, "already_have_account")}{" "}
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-primary hover:underline font-medium"
            >
              {t(lang, "login")}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
