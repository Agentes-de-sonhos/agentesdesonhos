import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashNonce, parseState } from "../_shared/googleOAuthState.ts";
import { buildTokenColumns, getTokenEncKey } from "../_shared/googleTokenCrypto.ts";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(redirectHtml("Erro ao conectar com o Google Calendar.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !stateParam) {
      return new Response(redirectHtml("Parâmetros inválidos.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-callback`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Atomic single-use consumption of the cryptographic state.
    const parsed = parseState(stateParam);
    if (!parsed) {
      console.error("callback rejected: malformed state");
      return new Response(redirectHtml("Requisição de conexão inválida ou expirada.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { data: consumedUserId, error: consumeError } = await supabase.rpc("consume_google_oauth_state", {
      p_id: parsed.stateId,
      p_nonce_hash: await hashNonce(parsed.nonce),
    });

    if (consumeError || !consumedUserId) {
      console.error("callback rejected: state not consumable", consumeError?.message);
      return new Response(redirectHtml("Requisição de conexão inválida ou expirada.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }
    const userId = consumedUserId as string;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return new Response(redirectHtml("Falha ao obter token do Google.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Reuse the stored refresh token when Google omits it on re-consent, so a
    // reconnect never downgrades an existing connection.
    const { data: existing } = await supabase
      .from("google_calendar_tokens")
      .select("refresh_token")
      .eq("user_id", userId)
      .maybeSingle();

    const refreshToken: string | undefined = tokenData.refresh_token || existing?.refresh_token || undefined;
    if (!refreshToken) {
      console.error("callback rejected: no refresh token available");
      return new Response(redirectHtml("O Google não retornou permissão de acesso contínuo. Tente novamente.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const tokenColumns = await buildTokenColumns(
      { access_token: tokenData.access_token, refresh_token: refreshToken },
      getTokenEncKey(),
    );

    const { error: upsertError } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        user_id: userId,
        ...tokenColumns,
        token_expires_at: expiresAt,
        sync_enabled: true,
        connection_state: "connected",
        last_auth_error: null,
        last_auth_error_at: null,
        sync_in_progress: false,
        sync_lock_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(redirectHtml("Erro ao salvar credenciais.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(redirectHtml("Google Calendar conectado com sucesso!", true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("Callback error:", err);
    return new Response(redirectHtml("Erro inesperado.", false), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function redirectHtml(message: string, success: boolean): string {
  const color = success ? "#22c55e" : "#ef4444";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Google Calendar</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f9fafb">
  <div style="text-align:center;max-width:400px">
    <div style="font-size:48px;margin-bottom:16px">${success ? "✅" : "❌"}</div>
    <h2 style="color:${color}">${message}</h2>
    <p style="color:#6b7280">Você pode fechar esta janela.</p>
    <script>setTimeout(()=>{window.close()},3000)</script>
  </div>
</body></html>`;
}
