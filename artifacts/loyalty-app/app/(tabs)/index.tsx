import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useGetWallet,
  useGetWalletBusiness,
  type WalletEntry,
} from "@workspace/api-client-react";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { registerForPushNotifications } from "@/lib/notifications";

function ProgressToReward({ entry }: { entry: WalletEntry }) {
  const { data } = useGetWalletBusiness(entry.merchant_id);
  if (!data) return <View style={styles.progressPlaceholder} />;

  const tiers = (data.reward_tiers || [])
    .filter((t) => t.active)
    .sort((a, b) => a.points_required - b.points_required);
  const next = tiers.find((t) => t.points_required > entry.points);
  const reached = tiers.filter((t) => t.points_required <= entry.points);

  if (!next) {
    return (
      <Text style={styles.progressLabel}>
        {tiers.length > 0
          ? `All ${tiers.length} rewards unlocked — redeem in store!`
          : "No rewards set up yet"}
      </Text>
    );
  }

  const prevPoints = reached.length
    ? reached[reached.length - 1].points_required
    : 0;
  const pct = Math.min(
    1,
    Math.max(0, (entry.points - prevPoints) / (next.points_required - prevPoints)),
  );

  return (
    <View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        {next.points_required - entry.points} pts to {next.name}
      </Text>
    </View>
  );
}

function BusinessCard({ entry }: { entry: WalletEntry }) {
  const router = useRouter();
  const base = entry.brand_color_1 || "#7c3aed";

  return (
    <Pressable
      onPress={() => router.push(`/business/${entry.merchant_id}`)}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={[base, `${base}cc`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>
            {entry.business_name}
          </Text>
          {entry.muted && <Feather name="bell-off" size={16} color="rgba(255,255,255,0.7)" />}
        </View>
        <View style={styles.cardPointsRow}>
          <Text style={styles.cardPoints}>{entry.points}</Text>
          <Text style={styles.cardPointsLabel}> pts</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.cardVisits}>
            {entry.visits} visit{entry.visits === 1 ? "" : "s"}
          </Text>
        </View>
        <ProgressToReward entry={entry} />
      </LinearGradient>
    </Pressable>
  );
}

export default function WalletScreen() {
  const c = useColors();
  const router = useRouter();
  const { token } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useGetWallet();

  useEffect(() => {
    if (token) registerForPushNotifications();
  }, [token]);

  const onRefresh = useCallback(() => refetch(), [refetch]);

  const wallet = data?.wallet || [];

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={wallet}
          keyExtractor={(w) => w.merchant_id}
          renderItem={({ item }) => <BusinessCard entry={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: c.accent }]}>
                <Feather name="credit-card" size={28} color={c.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>
                Your wallet is empty
              </Text>
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                Join a business with their invite code or QR code to start
                earning points.
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.fabRow}>
        <Pressable
          onPress={() => router.push("/earn")}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="zap" size={20} color="#fff" />
          <Text style={styles.fabText}>Earn</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/join")}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="plus" size={22} color="#fff" />
          <Text style={styles.fabText}>Join</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 140, gap: 14 },
  card: {
    borderRadius: 18,
    padding: 18,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: "#fff",
    flex: 1,
    marginRight: 8,
  },
  cardPointsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 14,
    marginBottom: 12,
  },
  cardPoints: { fontFamily: "Inter_700Bold", fontSize: 34, color: "#fff" },
  cardPointsLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
  },
  cardVisits: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: "#fff" },
  progressLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  progressPlaceholder: { height: 24 },
  empty: { alignItems: "center", paddingTop: 90, paddingHorizontal: 40 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, marginBottom: 8 },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  fabRow: {
    position: "absolute",
    right: 20,
    bottom: 108,
    flexDirection: "row",
    gap: 10,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
