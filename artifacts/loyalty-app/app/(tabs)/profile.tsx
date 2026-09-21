import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import {
  getGetMyRedemptionsQueryKey,
  useGetMyRedemptions,
  type Redemption,
} from "@workspace/api-client-react";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { nextPageOffset } from "@/lib/paging";
import {
  registerForPushNotifications,
  unregisterPushNotifications,
} from "@/lib/notifications";

export default function ProfileScreen() {
  const c = useColors();
  const router = useRouter();
  const { customer, signOut } = useAuth();
  // Offset-paged redemption history: pages accumulate as the customer
  // scrolls, mirroring the feed screen's pattern.
  const PAGE_SIZE = 30;
  const [offset, setOffset] = useState(0);
  const [pages, setPages] = useState<Map<number, Redemption[]>>(new Map());
  const listParams = { limit: PAGE_SIZE, offset };
  const { data, isFetching } = useGetMyRedemptions(listParams, {
    query: { queryKey: getGetMyRedemptionsQueryKey(listParams) },
  });
  useEffect(() => {
    if (!data) return;
    setPages((prev) => {
      const next = new Map(prev);
      next.set(data.offset, data.redemptions);
      return next;
    });
  }, [data]);
  const hasMore = data?.has_more ?? false;
  const [pushEnabled, setPushEnabled] = useState(true);

  const redemptions = useMemo(() => {
    const seen = new Set<string>();
    const all: Redemption[] = [];
    for (const pageOffset of Array.from(pages.keys()).sort((a, b) => a - b)) {
      for (const r of pages.get(pageOffset)!) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          all.push(r);
        }
      }
    }
    return all;
  }, [pages]);

  // Load the next page when the scroll view nears the bottom. Deriving the
  // next offset from the server-echoed offset keeps duplicate scroll events
  // idempotent (see lib/paging).
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!hasMore || isFetching || !data) return;
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) {
      setOffset(nextPageOffset(data.offset, PAGE_SIZE));
    }
  };

  const togglePush = async (value: boolean) => {
    setPushEnabled(value);
    if (value) {
      const ok = await registerForPushNotifications();
      if (!ok && Platform.OS !== "web") {
        setPushEnabled(false);
      }
    } else {
      await unregisterPushNotifications();
    }
  };

  const confirmLogout = () => {
    if (Platform.OS === "web") {
      signOut();
      return;
    }
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.list}
      onScroll={onScroll}
      scrollEventThrottle={100}
    >
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.avatar, { backgroundColor: c.primary }]}>
          <Text style={styles.avatarText}>
            {(customer?.name || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.foreground }]}>
            {customer?.name || "Member"}
          </Text>
          <Text style={[styles.contact, { color: c.mutedForeground }]}>
            {customer?.email || customer?.phone || ""}
          </Text>
        </View>
      </View>

      {customer && !customer.profile_completed_at ? (
        <Pressable
          onPress={() => router.push("/complete-profile")}
          style={({ pressed }) => [
            styles.completeCard,
            { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="gift" size={20} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.completeTitle}>Complete your profile</Text>
            <Text style={styles.completeSub}>
              Earn 50 bonus points at every business in your wallet.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#fff" />
        </Pressable>
      ) : null}

      <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>
        Account
      </Text>
      <Pressable
        onPress={() => router.push("/edit-profile")}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: c.card,
            borderColor: c.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather name="edit-2" size={18} color={c.primary} />
        <Text style={[styles.rowLabel, { color: c.foreground }]}>
          Edit profile
        </Text>
        <Feather name="chevron-right" size={18} color={c.mutedForeground} />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>
        Notifications
      </Text>
      <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
        <Feather name="bell" size={18} color={c.primary} />
        <Text style={[styles.rowLabel, { color: c.foreground }]}>
          Push notifications
        </Text>
        <Switch
          value={pushEnabled}
          onValueChange={togglePush}
          trackColor={{ true: c.primary }}
        />
      </View>
      <Text style={[styles.hint, { color: c.mutedForeground }]}>
        You can also mute individual businesses from their card in your wallet.
      </Text>

      <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>
        Redemption history
      </Text>
      {redemptions.length === 0 ? (
        <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.hintInline, { color: c.mutedForeground }]}>
            No redemptions yet — redeem a reward from a business card.
          </Text>
        </View>
      ) : (
        redemptions.map((r) => (
          <View
            key={r.id}
            style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <Feather
              name={
                r.status === "confirmed"
                  ? "check-circle"
                  : r.status === "pending"
                    ? "clock"
                    : "x-circle"
              }
              size={18}
              color={
                r.status === "confirmed"
                  ? c.success
                  : r.status === "pending"
                    ? c.warning
                    : c.mutedForeground
              }
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: c.foreground }]}>
                Code {r.code}
              </Text>
              <Text style={[styles.rowSub, { color: c.mutedForeground }]}>
                {r.points_spent > 0 ? `${r.points_spent} pts • ` : ""}
                {new Date(r.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text
              style={[
                styles.status,
                {
                  color:
                    r.status === "confirmed"
                      ? c.success
                      : r.status === "pending"
                        ? c.warning
                        : c.mutedForeground,
                },
              ]}
            >
              {r.status === "confirmed"
                ? "Confirmed"
                : r.status === "pending"
                  ? "Pending"
                  : r.status === "expired"
                    ? "Expired"
                    : "Cancelled"}
            </Text>
          </View>
        ))
      )}
      {isFetching && offset > 0 ? (
        <ActivityIndicator color={c.primary} style={{ marginVertical: 8 }} />
      ) : null}

      <Pressable
        onPress={confirmLogout}
        style={({ pressed }) => [
          styles.logout,
          { borderColor: c.destructive, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Feather name="log-out" size={16} color={c.destructive} />
        <Text style={[styles.logoutText, { color: c.destructive }]}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 130 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  contact: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: colors.radius,
    padding: 14,
    marginBottom: 8,
  },
  rowLabel: { fontFamily: "Inter_500Medium", fontSize: 15, flex: 1 },
  rowSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  status: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  hintInline: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: colors.radius,
    paddingVertical: 13,
    marginTop: 28,
  },
  logoutText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  completeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  completeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  completeSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
});
