import { Redirect, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { stashPendingJoinCode } from "@/lib/pending-join-code";

/**
 * Deep-link target for stelvo-loyalty://join/<CODE> (and /join/<CODE> URLs).
 * Logged in: redirects to the join screen with the code pre-filled.
 * Logged out: stashes the code so the auth gate can restore it after
 * sign-up/login, then sends the user to the auth screen.
 */
export default function JoinWithCode() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { token, loading } = useAuth();
  const clean = typeof code === "string" ? code.trim().toUpperCase() : "";
  const loggedOut = !loading && !token;

  useEffect(() => {
    if (loggedOut && clean) {
      void stashPendingJoinCode(clean);
    }
  }, [loggedOut, clean]);

  if (loading) return null;

  if (!token) {
    return <Redirect href="/auth" />;
  }

  return (
    <Redirect
      href={clean ? { pathname: "/join", params: { code: clean } } : "/join"}
    />
  );
}
