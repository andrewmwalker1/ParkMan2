// ParkMan2 -- user admin (invite / deactivate / reactivate).
// Called from src/pages/admin/UsersTab.jsx via supabase.functions.invoke("parkman2-manage-users", ...).
//
// Uses the service role deliberately: creating a user and banning their
// auth account both require the Auth Admin API, which the anon/authenticated
// client can never call. Because this bypasses RLS by design, it re-checks
// the caller's own business membership itself before doing anything.
//
// No invite email is sent from here -- ParkMan2's sign-in page already
// self-serves a magic-link/OTP email for any known account (see
// src/pages/Login.jsx), so once the account + profiles row exist below,
// the new person just goes there and requests a code themselves. That
// sidesteps needing a second email provider/template just for invites
// (Maintenance's version needs one because its invite links carry
// role/site context that a plain OTP request can't).

import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { db: { schema: "parkman2" } }
);

// Called directly from the browser on a different origin than this
// function -- every response (including the OPTIONS preflight) needs
// these headers or the browser blocks the response before the page ever
// sees it.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function authorizeCaller(req: Request): Promise<{ ok: boolean; businessId?: string }> {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return { ok: false };

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return { ok: false };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("business_id")
    .eq("id", userData.user.id)
    .single();
  if (profileError || !profile) return { ok: false };

  return { ok: true, businessId: profile.business_id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { ok, businessId } = await authorizeCaller(req);
  if (!ok || !businessId) {
    return jsonResponse({ error: "Not authorized" }, 403);
  }

  const body = await req.json();
  const { action } = body;

  if (action === "invite") {
    const { email, displayName } = body;
    if (!email || !displayName) {
      return jsonResponse({ error: "email and displayName are required" }, 400);
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (createError) {
      console.error("createUser failed", createError.name, createError.status, createError.message);
      const message = createError.message?.includes("already been registered")
        ? "That email already has an account on a Tree Tops system -- it can't be added here yet."
        : createError.message || "Could not create account -- check function logs";
      return jsonResponse({ error: message }, 400);
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      business_id: businessId,
      display_name: displayName,
      is_active: true,
    });
    if (profileError) return jsonResponse({ error: profileError.message }, 500);

    return jsonResponse({ ok: true });
  }

  if (action === "deactivate" || action === "reactivate") {
    const { userId } = body;
    if (!userId) return jsonResponse({ error: "userId is required" }, 400);

    const isActive = action === "reactivate";
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId)
      .eq("business_id", businessId);
    if (profileError) return jsonResponse({ error: profileError.message }, 500);

    // A ban blocks new sign-ins and token refreshes immediately -- the hard
    // cutoff. profiles.is_active is the belt-and-braces check on the client
    // side (AuthContext) for any access token still technically live until
    // it naturally expires.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: isActive ? "none" : "876000h",
    });
    if (banError) return jsonResponse({ error: banError.message }, 500);

    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: `Unknown action "${action}"` }, 400);
});
