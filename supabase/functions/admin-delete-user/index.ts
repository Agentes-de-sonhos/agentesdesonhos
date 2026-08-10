import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller via JWT claims (signing-keys compatible)
    const callerClient = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("getClaims error:", claimsError);
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (user_id === callerId) {
      return new Response(JSON.stringify({ error: "Você não pode excluir sua própria conta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // O usuário pode ser (a) um colaborador de equipe, (b) um proprietário/master
    // de agência com equipe, ou (c) uma conta comum. Cada caso exige limpeza
    // diferente para nunca deixar registros de equipe ativos órfãos.
    const { data: memberRow } = await adminClient
      .from("agency_team_members")
      .select("id, agency_id, full_name, login")
      .eq("auth_user_id", user_id)
      .maybeSingle();

    const { count: ownedMembers } = await adminClient
      .from("agency_team_members")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", user_id);

    const { count: pendingInvites } = await adminClient
      .from("agency_team_invites")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", user_id)
      .is("accepted_at", null)
      .is("revoked_at", null);

    // Proteção conservadora: nunca excluir a conta master enquanto houver
    // qualquer colaborador vinculado ou convite pendente. Não há cascata
    // destrutiva de agência — o administrador precisa remover/revogar a equipe
    // primeiro, para não deixar a agência inteira órfã.
    const members = ownedMembers ?? 0;
    const invites = pendingInvites ?? 0;
    if (!memberRow && (members > 0 || invites > 0)) {
      const partes = [
        members > 0 ? `${members} colaborador(es)` : null,
        invites > 0 ? `${invites} convite(s) pendente(s)` : null,
      ].filter(Boolean).join(" e ");
      return new Response(
        JSON.stringify({
          error: `Esta é a conta principal de uma agência com ${partes}. Remova os colaboradores e revogue os convites pendentes em Equipe e Permissões antes de excluir a conta principal.`,
          code: "master_has_team",
          team_members: members,
          pending_invites: invites,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Limpeza do registro de equipe (permissões, scopes, stage permissions,
    // segredos e sessões saem por cascade nos FKs de agency_team_members).
    if (memberRow) {
      await adminClient.from("agency_team_sessions").delete().eq("team_member_id", memberRow.id);
      await adminClient.from("agency_team_member_secrets").delete().eq("member_id", memberRow.id);
      await adminClient.from("agency_team_permissions").delete().eq("team_member_id", memberRow.id);
      await adminClient.from("agency_team_scopes").delete().eq("team_member_id", memberRow.id);
      await adminClient.from("agency_team_stage_permissions").delete().eq("team_member_id", memberRow.id);
      const { error: memberDelErr } = await adminClient
        .from("agency_team_members").delete().eq("id", memberRow.id);
      if (memberDelErr) {
        console.error("team member delete error:", memberDelErr);
        return new Response(JSON.stringify({ error: "Erro ao remover o colaborador da equipe." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await adminClient.from("agency_membership").delete().eq("user_id", user_id);
      await adminClient.from("agency_team_audit_log").insert({
        agency_id: memberRow.agency_id,
        action: "delete_member",
        module_key: "team",
        entity_type: "team_member",
        entity_id: memberRow.id,
        details: {
          via: "admin-delete-user",
          admin_action: true,
          actor_user_id: callerId,
          subject: memberRow.full_name,
          login: memberRow.login,
        },
      }).then(({ error }) => { if (error) console.error("audit insert error", error) });
    }

    // Assinatura técnica (Start criada pelo trigger) não tem FK para auth.users:
    // precisa ser removida explicitamente para não ficar órfã.
    await adminClient.from("subscriptions").delete().eq("user_id", user_id);

    // Remove o auth user (perfis/roles saem por cascade). Se ele já não existir,
    // o resultado ainda é sucesso: a limpeza acima é o objetivo.
    const { data: existingAuth } = await adminClient.auth.admin.getUserById(user_id);
    let authDeleted = false;
    if (existingAuth?.user) {
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteError) {
        console.error("Delete user error:", deleteError);
        return new Response(JSON.stringify({ error: "Erro ao excluir usuário." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authDeleted = true;
    } else {
      // Registro órfão: garante que perfil/roles residuais também saiam.
      await adminClient.from("profiles").delete().eq("user_id", user_id);
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        auth_deleted: authDeleted,
        team_member_removed: !!memberRow,
        was_orphan: !authDeleted,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("admin-delete-user error:", err);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
