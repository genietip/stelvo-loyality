import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import {
  getGetWalletQueryKey,
  useCreateRedemption,
  useGetWalletBusiness,
  useUpdateWalletBusiness,
  type RewardTier,
} from "@workspace/api-client-react";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

export default function BusinessDetailScreen() {
  const c = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { merchantId, joined } = useLocalSearchParams<{
    merchantId: string;
    joined?: string;
  }>();
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [showJoined, setShowJoined] = useState(joined === "1");

  const { data, isLoading, queryKey } = useGetWalletBusiness(merchantId || "");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
  };

  const update = useUpdateWalletBusiness({
    mutation: { onSuccess: invalidate },
  });

  const redeem = useCreateRedemption({
    mutation: {
      onSuccess: (reply) => {
        setRedeemingId(null);
        invalidate();
        router.push({
          pathname: "/redemption",
          params: {
            code: reply.redemption.code,
            business: data?.membership.business_name || "",
            expiresAt: reply.redemption.expires_at || "",
          },
        });
      },
      onError: (err: any) => {
        setRedeemingId(null);
        const msg = err?.data?.error || "Could not redeem. Try again.";
        if (Platform.OS === "web") {
          // eslint-disable-next-line no-alert
          alert(msg);
        } else {
          Alert.alert("Redemption failed", msg);
        }
      },
    },
  });

  if (isLoading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const { membership, reward_tiers, deals } = data;
  const base = membership.brand_color_1 || "#7c3aed";
  const tiers = [...reward_tiers]
    .filter((t) => t.active)
    .sort((a, b) => a.points_required - b.points_required);
  const next = tiers.find((t) => t.points_required > membership.points);

  // Opens the phone's maps app with directions from the user's current
  // location to the business address.
  const address = membership.address || null;
  const openDirections = () => {
    if (!address) return;
    const dest = encodeURIComponent(address);
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${dest}`,
      android: `geo:0,0?q=${dest}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
    });
    Linking.openURL(url).catch(() => {
      // Fall back to Google Maps in the browser if no maps app handles it.
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`).catch(() => {});
    });
  };

  const onRedeemTier = (tier: RewardTier) => {
    const go = () => {
      setRedeemingId(tier.id);
      redeem.mutate({
        data: { merchant_id: membership.merchant_id, reward_tier_id: tier.id },
      });
    };
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (confirm(`Redeem "${tier.name}" for ${tier.points_required} points?`)) go();
      return;
    }
    Alert.alert(
      "Redeem reward",
      `Redeem "${tier.name}" for ${tier.points_required} points? Show the confirmation code to staff.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Redeem", onPress: go },
      ],
    );
  };

  const onLeave = () => {
    const go = () =>
      update.mutate(
        { merchantId: membership.merchant_id, data: { opted_in: false } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
            router.back();
          },
        },
      );
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (confirm(`Leave ${membership.business_name}'s loyalty program?`)) go();
      return;
    }
    Alert.alert(
      "Leave program",
      `Leave ${membership.business_name}'s loyalty program? You'll stop earning points and receiving deals.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: go },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: membership.business_name }} />
      <ScrollView
        style={{ backgroundColor: c.background }}
        contentContainerStyle={styles.list}
      >
        {showJoined && (
          <View style={[styles.joinedBanner, { backgroundColor: c.accent }]}>
            <Feather name="check-circle" size={18} color={c.primary} />
            <Text style={[styles.joinedBannerText, { color: c.foreground }]}>
              You've joined {membership.business_name}!
            </Text>
            <Pressable onPress={() => setShowJoined(false)} hitSlop={8}>
              <Feather name="x" size={16} color={c.mutedForeground} />
            </Pressable>
          </View>
        )}
        <LinearGradient
          colors={[base, `${base}cc`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroName}>{membership.business_name}</Text>
          <View style={styles.heroRow}>
            <Text style={styles.heroPoints}>{membership.points}</Text>
            <Text style={styles.heroPointsLabel}> points</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.heroVisits}>
              {membership.visits} visit{membership.visits === 1 ? "" : "s"}
            </Text>
          </View>
          {next && (
            <Text style={styles.heroNext}>
              {next.points_required - membership.points} pts to {next.name}
            </Text>
          )}
        </LinearGradient>

        {address && (
          <Pressable
            onPress={openDirections}
            style={({ pressed }) => [
              styles.row,
              styles.directionsRow,
              { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[styles.tierBadge, { backgroundColor: c.accent }]}>
              <Feather name="map-pin" size={16} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: c.foreground }]}>Directions</Text>
              <Text style={[styles.rowSub, { color: c.mutedForeground }]} numberOfLines={2}>
                {address}
              </Text>
            </View>
            <Feather name="external-link" size={16} color={c.mutedForeground} />
          </Pressable>
        )}

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>Rewards</Text>
        {tiers.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            This business hasn't added rewards yet.
          </Text>
        ) : (
          tiers.map((tier) => {
            const unlocked = membership.points >= tier.points_required;
            return (
              <View
                key={tier.id}
                style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}
              >
                <View
                  style={[
                    styles.tierBadge,
                    { backgroundColor: unlocked ? c.accent : c.muted },
                  ]}
                >
                  <Feather
                    name={unlocked ? "gift" : "lock"}
                    size={16}
                    color={unlocked ? c.primary : c.mutedForeground}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: c.foreground }]}>
                    {tier.name}
                  </Text>
                  <Text style={[styles.rowSub, { color: c.mutedForeground }]}>
                    {tier.points_required} pts
                    {tier.description ? ` • ${tier.description}` : ""}
                  </Text>
                </View>
                <Pressable
                  disabled={!unlocked || redeemingId === tier.id}
                  onPress={() => onRedeemTier(tier)}
                  style={({ pressed }) => [
                    styles.redeemBtn,
                    {
                      backgroundColor: unlocked ? c.primary : c.muted,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  {redeemingId === tier.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.redeemText,
                        { color: unlocked ? "#fff" : c.mutedForeground },
                      ]}
                    >
                      Redeem
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })
        )}

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>
          Current deals
        </Text>
        {deals.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            No active deals right now.
          </Text>
        ) : (
          deals.map((deal) => (
            <View
              key={deal.id}
              style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}
            >
              <View style={[styles.tierBadge, { backgroundColor: c.accent }]}>
                <Feather name="tag" size={16} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.foreground }]}>
                  {deal.title}
                </Text>
                {!!deal.description && (
                  <Text style={[styles.rowSub, { color: c.mutedForeground }]}>
                    {deal.description}
                  </Text>
                )}
                {!!deal.ends_at && (
                  <Text style={[styles.rowSub, { color: c.warning }]}>
                    Ends {new Date(deal.ends_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>Settings</Text>
        <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
          <Feather name="bell-off" size={18} color={c.primary} />
          <Text style={[styles.rowTitle, { color: c.foreground, flex: 1 }]}>
            Mute notifications
          </Text>
          <Switch
            value={membership.muted}
            onValueChange={(muted) =>
              update.mutate({ merchantId: membership.merchant_id, data: { muted } })
            }
            trackColor={{ true: c.primary }}
          />
        </View>

        <Pressable
          onPress={onLeave}
          style={({ pressed }) => [
            styles.leave,
            { borderColor: c.destructive, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.leaveText, { color: c.destructive }]}>
            Leave loyalty program
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  joinedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  joinedBannerText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 48 },
  hero: { borderRadius: 18, padding: 20 },
  heroName: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: "#fff" },
  heroRow: { flexDirection: "row", alignItems: "baseline", marginTop: 10 },
  heroPoints: { fontFamily: "Inter_700Bold", fontSize: 38, color: "#fff" },
  heroPointsLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
  },
  heroVisits: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  heroNext: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 24,
    marginBottom: 10,
  },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: colors.radius,
    padding: 14,
    marginBottom: 8,
  },
  tierBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  directionsRow: { marginTop: 16, marginBottom: 0 },
  rowTitle: { fontFamily: "Inter_500Medium", fontSize: 15 },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  redeemBtn: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 76,
    alignItems: "center",
  },
  redeemText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  leave: {
    borderWidth: 1,
    borderRadius: colors.radius,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 24,
  },
  leaveText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
