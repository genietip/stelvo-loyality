import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_JOIN_CODE_KEY = "stelvo_loyalty_pending_join_code";

// In-memory mirror so the auth gate can act without an extra async round-trip
// in the common case (deep link stashed during this app session).
let pendingCode: string | null = null;

export async function stashPendingJoinCode(code: string): Promise<void> {
  const clean = code.trim().toUpperCase();
  if (!clean) return;
  pendingCode = clean;
  try {
    await AsyncStorage.setItem(PENDING_JOIN_CODE_KEY, clean);
  } catch {
    // Memory copy still covers this session.
  }
}

/** Returns the stashed code (if any) and clears the stash. */
export async function consumePendingJoinCode(): Promise<string | null> {
  let code = pendingCode;
  if (!code) {
    try {
      code = await AsyncStorage.getItem(PENDING_JOIN_CODE_KEY);
    } catch {
      code = null;
    }
  }
  pendingCode = null;
  try {
    await AsyncStorage.removeItem(PENDING_JOIN_CODE_KEY);
  } catch {
    // Best effort.
  }
  return code ? code.trim().toUpperCase() : null;
}
