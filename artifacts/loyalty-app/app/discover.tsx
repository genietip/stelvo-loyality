import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getGetWalletQueryKey,
  getListLoyaltyBusinessesQueryKey,
  useGetWallet,
  useJoinBusiness,
  useListLoyaltyBusinesses,
  type DiscoverBusiness,
} from "@workspace/api-client-react";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

export default function DiscoverScreen() {
  const c = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Customer location (city + zip) — used to rank nearby businesses first.
  // If permission is denied or lookup fails, we quietly fall back to the
  // alphabetical directory.
  const [locParams, setLocParams] = useState<{ zip?: string; city?: string } | null>(null);
  const [locResolved, setLocResolved] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        const places = await Location.reverseGeocodeAsync(pos.coords);
        const place = places[0];
        if (cancelled || !place) return;
        const params: { zip?: string; city?: string } = {};
        if (place.postalCode) params.zip = place.postalCode;
        if (place.city) params.city = place.city;
        if (params.zip || params.city) setLocParams(params);
      } catch {
        // No location — alphabetical fallback.
      } finally {
        if (!cancelled) setLocResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = search.trim();
  const filterParams = useMemo(
    () => ({
      ...(trimmed ? { search: trimmed } : {}),
      ...(industry ? { industry } : {}),
      ...(locParams ?? {}),
    }),
    [trimmed, industry, locParams],
  );

  // Offset-paged directory: pages accumulate as the customer scrolls and
  // reset whenever the filters change.
  const PAGE_SIZE = 30;
  const [offset, setOffset] = useState(0);
  const [pages, setPages] = useState<Map<number, DiscoverBusiness[]>>(new Map());
  const filterKey = JSON.stringify(filterParams);
  useEffect(() => {
    setOffset(0);
    setPages(new Map());
  }, [filterKey]);

  const listParams = { ...filterParams, limit: PAGE_SIZE, offset };
  const { data, isLoading, isFetching } = useListLoyaltyBusinesses(listParams, {
    // Wait for the location attempt before the first fetch so nearby results
    // arrive ranked, instead of flashing an unranked list.
    query: {
      enabled: locResolved,
      queryKey: getListLoyaltyBusinessesQueryKey(listParams),
    },
  });
  useEffect(() => {
    if (!data) return;
    setPages((prev) => {
      const next = new Map(prev);
      next.set(data.offset, data.businesses);
      return next;
    });
  }, [data]);
  const hasMore = data?.has_more ?? false;
  const loadMore = () => {
    if (hasMore && !isFetching) setOffset((prev) => prev + PAGE_SIZE);
  };
  const { data: walletData } = useGetWallet();
  const joinedIds = useMemo(
    () => new Set((walletData?.wallet ?? []).filter((w) => w.opted_in).map((w) => w.merchant_id)),
    [walletData],
  );

  const businesses = useMemo(() => {
    const seen = new Set<string>();
    const out: DiscoverBusiness[] = [];
    for (const key of Array.from(pages.keys()).sort((a, b) => a - b)) {
      for (const b of pages.get(key)!) {
        if (!seen.has(b.merchant_id)) {
          seen.add(b.merchant_id);
          out.push(b);
        }
      }
    }
    return out;
  }, [pages]);
  const industries = useMemo(() => {
    const set = new Set<string>();
    for (const b of businesses) if (b.industry) set.add(b.industry);
    return Array.from(set).sort();
  }, [businesses]);

  // Group the loaded businesses by type (e.g. Restaurants, Nail Salons) so
  // the directory reads like a categorized guide. Groups are alphabetical;
  // within a group the server's nearby-first order is preserved.
  type Row =
    | { kind: "header"; key: string; label: string }
    | { kind: "business"; key: string; business: DiscoverBusiness };
  const rows = useMemo<Row[]>(() => {
    const groups = new Map<string, DiscoverBusiness[]>();
    for (const b of businesses) {
      const label = (b.industry || "").trim() || "Other";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(b);
    }
    const labels = Array.from(groups.keys()).sort((a, z) => {
      if (a === "Other") return 1;
      if (z === "Other") return -1;
      return a.localeCompare(z);
    });
    const out: Row[] = [];
    for (const label of labels) {
      out.push({ kind: "header", key: `h:${label}`, label });
      for (const b of groups.get(label)!) {
        out.push({ kind: "business", key: b.merchant_id, business: b });
      }
    }
    return out;
  }, [businesses]);

  const join = useJoinBusiness({
    mutation: {
      onSuccess: async (res) => {
        setJoiningCode(null);
        await queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        router.push(`/business/${res.membership.merchant_id}`);
      },
      onError: (err: any) => {
        setJoiningCode(null);
        setError(err?.data?.error || "Couldn't join that business. Try again.");
      },
    },
  });

  const handleJoin = (b: DiscoverBusiness) => {
    setError(null);
    setJoiningCode(b.code);
    join.mutate({ data: { code: b.code } });
  };

  const renderBusiness = (item: DiscoverBusiness) => {
    const joined = joinedIds.has(item.merchant_id);
    const joining = joiningCode === item.code && join.isPending;
    return (
      <View style={[styles.card, { borderColor: c.border, backgroundColor: c.card }]}>
        {item.logo_url ? (
          <Image source={{ uri: item.logo_url }} style={styles.logo} />
        ) : (
          <View
            style={[
              styles.logo,
              styles.logoFallback,
              { backgroundColor: item.brand_color_1 || c.accent },
            ]}
          >
            <Text style={styles.logoLetter}>
              {item.business_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={1}>
            {item.business_name}
          </Text>
          <View style={styles.metaRow}>
            {item.nearby && (
              <View style={[styles.nearbyBadge, { backgroundColor: c.accent }]}>
                <Feather name="map-pin" size={10} color={c.primary} />
                <Text style={[styles.nearbyText, { color: c.primary }]}>Nearby</Text>
              </View>
            )}
            <Text
              style={[styles.cardMeta, { color: c.mutedForeground, flexShrink: 1 }]}
              numberOfLines={1}
            >
              {[item.industry, item.city].filter(Boolean).join(" · ") || "Loyalty program"}
            </Text>
          </View>
        </View>
        {joined ? (
          <Pressable
            onPress={() => router.push(`/business/${item.merchant_id}`)}
            style={[styles.joinBtn, { backgroundColor: c.accent }]}
          >
            <Text style={[styles.joinBtnText, { color: c.primary }]}>Joined</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => handleJoin(item)}
            disabled={join.isPending}
            style={({ pressed }) => [
              styles.joinBtn,
              { backgroundColor: c.primary, opacity: pressed || join.isPending ? 0.8 : 1 },
            ]}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.joinBtnText, { color: "#fff" }]}>Join</Text>
            )}
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.searchWrap, { borderColor: c.input }]}>
        <Feather name="search" size={16} color={c.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: c.foreground }]}
          placeholder="Search businesses"
          placeholderTextColor={c.mutedForeground}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={16} color={c.mutedForeground} />
          </Pressable>
        )}
      </View>

      {industries.length > 1 && (
        <FlatList
          horizontal
          data={industries}
          keyExtractor={(i) => i}
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
          renderItem={({ item }) => {
            const active = industry === item;
            return (
              <Pressable
                onPress={() => setIndustry(active ? null : item)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.primary : c.card,
                    borderColor: active ? c.primary : c.border,
                  },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: active ? "#fff" : c.foreground }]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {error && <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>}

      {!locResolved || (isLoading && businesses.length === 0) ? (
        <ActivityIndicator style={styles.loader} color={c.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={({ item }) =>
            item.kind === "header" ? (
              <Text style={[styles.groupHeader, { color: c.mutedForeground }]}>
                {item.label}
              </Text>
            ) : (
              renderBusiness(item.business)
            )
          }
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetching && offset > 0 ? (
              <ActivityIndicator style={styles.footerLoader} color={c.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: c.accent }]}>
                <Feather name="compass" size={26} color={c.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>
                No businesses found
              </Text>
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                {trimmed || industry
                  ? "Try a different search or clear the filters."
                  : "Participating businesses will show up here."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: colors.radius,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  chipsRow: { flexGrow: 0, marginTop: 12 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  error: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 12,
  },
  loader: { marginTop: 40 },
  groupHeader: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 2,
  },
  footerLoader: { marginVertical: 16 },
  listContent: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: colors.radius,
    padding: 12,
  },
  logo: { width: 44, height: 44, borderRadius: 10 },
  logoFallback: { alignItems: "center", justifyContent: "center" },
  logoLetter: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 2 },
  cardMeta: { fontFamily: "Inter_400Regular", fontSize: 13 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nearbyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  nearbyText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  joinBtn: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 68,
    alignItems: "center",
  },
  joinBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 6 },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
