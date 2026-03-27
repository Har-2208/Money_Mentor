const USERS_KEY = "amm_users";
const SESSION_KEY = "amm_session";

export function getActiveUserId() {
  try {
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    const usersRaw = localStorage.getItem(USERS_KEY);
    if (!sessionRaw || !usersRaw) return 1;

    const session = JSON.parse(sessionRaw);
    const users = JSON.parse(usersRaw);
    if (!session?.email || !Array.isArray(users)) return 1;

    const normalizedEmail = String(session.email).toLowerCase().trim();
    const index = users.findIndex(
      (user) => String(user?.email || "").toLowerCase().trim() === normalizedEmail,
    );

    return index >= 0 ? index + 1 : 1;
  } catch {
    return 1;
  }
}
