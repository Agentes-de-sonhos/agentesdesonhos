import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashNonce, parseState } from "../_shared/googleOAuthState.ts";
import {
  buildVerifiedEncryptedColumns,
  getTokenEncKey,
  readTokenField,
} from "../_shared/googleTokenCrypto.ts";
import { hasRequiredScopes, parseScopeString, resolveScopeVersion } from "../_shared/googleCalendarScopes.ts";

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

    // Fail-closed on the scope Google actually granted: without the events
    // scope the sync cannot work, so the credential is not stored at all.
    const grantedScopes = parseScopeString(tokenData.scope);
    if (!hasRequiredScopes(grantedScopes)) {
      console.error(`callback rejected: insufficient scope count=${grantedScopes.length}`);
      return new Response(
        redirectHtml(
          "Precisamos da permissão de eventos da agenda para sincronizar. Tente conectar novamente e mantenha a permissão marcada.",
          false,
        ),
        { headers: { "Content-Type": "text/html" } },
      );
    }

    // Reuse the stored refresh token when Google omits it on re-consent, so a
    // reconnect never downgrades an existing connection. Dual-read: the
    // encrypted column is used first, so this keeps working once the legacy
    // plaintext columns are cleared.
    const encKey = getTokenEncKey();
    // Encryption at rest is mandatory now that every stored connection is
    // encrypted-only: without the key we refuse the connection instead of
    // writing a readable credential.
    if (!encKey) {
      console.error("callback rejected: encryption key unavailable");
      return new Response(
        redirectHtml("Serviço temporariamente indisponível. Tente conectar novamente em alguns minutos.", false),
        { headers: { "Content-Type": "text/html" } },
      );
    }

    const { data: existing } = await supabase
      .from("google_calendar_tokens")
      .select("refresh_token, refresh_token_enc, access_token_enc, token_enc_version")
      .eq("user_id", userId)
      .maybeSingle();

    const storedRefreshToken = existing ? await readTokenField(existing, "refresh_token", encKey) : null;
    const refreshToken: string | undefined = tokenData.refresh_token || storedRefreshToken || undefined;
    if (!refreshToken) {
      console.error("callback rejected: no refresh token available");
      return new Response(redirectHtml("O Google não retornou permissão de acesso contínuo. Tente novamente.", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Verified round-trip (encrypt -> decrypt -> exact compare) before any write.
    const tokenColumns = await buildVerifiedEncryptedColumns(
      { access_token: tokenData.access_token, refresh_token: refreshToken },
      encKey,
    );
    if (!tokenColumns) {
      console.error("callback rejected: token encryption verification failed");
      return new Response(
        redirectHtml("Serviço temporariamente indisponível. Tente conectar novamente em alguns minutos.", false),
        { headers: { "Content-Type": "text/html" } },
      );
    }

    const { error: upsertError } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        user_id: userId,
        ...tokenColumns,
        token_expires_at: expiresAt,
        sync_enabled: true,
        connection_state: "connected",
        granted_scopes: grantedScopes.join(" "),
        scopes_checked_at: new Date().toISOString(),
        oauth_scope_version: resolveScopeVersion(grantedScopes),
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
