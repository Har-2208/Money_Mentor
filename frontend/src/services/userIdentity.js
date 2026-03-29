import { supabase } from "../lib/supabaseClient";

export async function getActiveUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  const userId = user?.id;
  if (!userId) {
    throw new Error("No active Supabase session. Please login again.");
  }

  return userId;
}
