import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function RedemptionScreen() {
  const c = useColors();
  const router = useRouter();
  const { code, business, expiresAt } = useLocalSearchParams<{
    code: string;
    business?: string;
    expiresAt?: string;
  }>();

  const expiryTime = expiresAt ? new Date(expiresAt).getTime() : null;
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    expiryTime && Number.isFinite(expiryTime) ? expiryTime - Date.now() : null,
  );

  useEffect(() => {
    if (!expiryTime || !Number.isFinite(expiryTime)) return;
    const tick = () => setRemainingMs(expiryTime - Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  const expired = remainingMs !== null && remainingMs <= 0;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: c.accent }]}>
        <Feather name="gift" size={26} color={c.primary} />
      </View>
      <Text style={[styles.title, { color: c.foreground }]}>
        {expired ? "This code expired" : "Show this to staff"}
      </Text>
      <Text style={[styles.sub, { color: c.mutedForeground }]}>
        {expired
          ? "Your points have been returned — redeem again to get a fresh code."
          : business
            ? `Staff at ${business} will confirm your redemption with this code.`
            : "Staff will confirm your redemption with this code."}
      </Text>

      <View
        style={[
          styles.qrCard,
          { backgroundColor: "#fff", borderColor: c.border, opacity: expired ? 0.3 : 1 },
        ]}
      >
        <QRCode value={code || "STELVO"} size={190} color="#0f0e13" />
      </View>

      <Text style={[styles.codeLabel, { color: c.mutedForeground }]}>
        Confirmation code
      </Text>
      <Text style={[styles.code, { color: expired ? c.mutedForeground : c.primary }]}>
        {code}
      </Text>

      {expired ? (
        <View style={[styles.pending, { backgroundColor: c.muted }]}>
          <Feather name="alert-circle" size={14} color={c.destructive} />
          <Text style={[styles.pendingText, { color: c.destructive }]}>
            Expired — points returned
          </Text>
        </View>
      ) : (
        <View style={[styles.pending, { backgroundColor: c.muted }]}>
          <Feather name="clock" size={14} color={c.warning} />
          <Text style={[styles.pendingText, { color: c.mutedForeground }]}>
            {remainingMs !== null
              ? `Expires in ${formatRemaining(remainingMs)} — pending until confirmed`
              : "Pending until confirmed by staff"}
          </Text>
        </View>
      )}

      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.done,
          { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", padding: 24, paddingTop: 36 },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 8 },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  qrCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  codeLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  code: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    letterSpacing: 6,
    marginBottom: 16,
  },
  pending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pendingText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  done: {
    alignSelf: "stretch",
    borderRadius: colors.radius,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: "auto",
  },
  doneText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
