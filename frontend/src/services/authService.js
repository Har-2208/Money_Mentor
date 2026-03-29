import { supabase } from "../lib/supabaseClient";

const PROFILE_TABLE = "profiles";

function buildSessionUser(user, profile) {
  const email = user?.email || profile?.email || "";
  const fullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    (email ? email.split("@")[0] : "User");

  return {
    id: user.id,
    user_id: user.id,
    email,
    name: fullName,
  };
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select("id, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function ensureProfile(user, fullNameOverride = null) {
  if (!user?.id) return null;

  const fullName =
    fullNameOverride ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  const payload = {
    id: user.id,
    full_name: fullName,
    email: user.email,
  };

  const { error } = await supabase
    .from(PROFILE_TABLE)
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw error;
  }

  return payload;
}

export async function signUpWithEmail({ fullName, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    throw error;
  }

  const authUser = data?.user;
  if (!authUser) {
    return {
      sessionUser: null,
      requiresEmailVerification: true,
    };
  }

  await ensureProfile(authUser, fullName);
  const profile = await getProfile(authUser.id);

  return {
    sessionUser: buildSessionUser(authUser, profile),
    requiresEmailVerification: !data.session,
  };
}

export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const authUser = data?.user;
  if (!authUser) {
    throw new Error("Login failed. Please try again.");
  }

  await ensureProfile(authUser);
  const profile = await getProfile(authUser.id);
  return buildSessionUser(authUser, profile);
}

export async function getCurrentSessionUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const authUser = session?.user;
  if (!authUser) return null;

  await ensureProfile(authUser);
  const profile = await getProfile(authUser.id);
  return buildSessionUser(authUser, profile);
}

export async function signOutSession() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}