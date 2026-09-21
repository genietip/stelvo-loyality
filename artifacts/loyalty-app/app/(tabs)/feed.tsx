import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getGetLoyaltyFeedQueryKey,
  useGetLoyaltyFeed,
  useOpenDealDelivery,
  type FeedItem,
} from "@workspace/api-client-react";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const mins = Math.floor((now - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function FeedScreen() {
  const c = useColors();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  // Cursor-paged feed: each page is anchored on the server-issued keyset
  // cursor of the previous one, so new deliveries arriving between requests
  // can't skip or duplicate items. Pull-to-refresh resets to the first page.
  const PAGE_SIZE = 30;
  const [cursor, setCursor] = useState<string | null>(null);
  // Pages keyed by the cursor that fetched them; Map preserves insertion
  // order, which is exactly newest-page-first order.
  const [pages, setPages] = useState<Map<string, FeedItem[]>>(new Map());

  const listParams = { limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) };
  const { data, isLoading, isFetching, refetch, isRefetching } = useGetLoyaltyFeed(listParams, {
    query: { queryKey: getGetLoyaltyFeedQueryKey(listParams) },
  });
  useEffect(() => {
    if (!data) return;
    setPages((prev) => {
      const next = new Map(prev);
      next.set(cursor ?? "", data.feed);
      return next;
    });
    // `cursor` still identifies the page `data` belongs to: it only advances
    // in loadMore, from this same `data`, after it has been stored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const hasMore = data?.has_more ?? false;
  // Advancing from the server-issued cursor keeps duplicate onEndReached
  // events idempotent: until the next page arrives, the target is unchanged.
  const loadMore = () => {
    if (!isFetching && data?.next_cursor) setCursor(data.next_cursor);
  };

  const openDelivery = useOpenDealDelivery({
    mutation: {
      onSuccess: () => {
        setPages(new Map());
        setCursor(null);
        queryClient.invalidateQueries({ queryKey: getGetLoyaltyFeedQueryKey() });
      },
    },
  });

  const sections = useMemo(() => {
    const seen = new Set<string>();
    const feed: FeedItem[] = [];
    for (const items of pages.values()) {
      for (const item of items) {
        if (!seen.has(item.delivery_id)) {
          seen.add(item.delivery_id);
          feed.push(item);
        }
      }
    }
    const byBusiness = new Map<string, FeedItem[]>();
    for (const item of feed) {
      const list = byBusiness.get(item.business_name) || [];
      list.push(item);
      byBusiness.set(item.business_name, list);
    }
    return Array.from(byBusiness.entries()).map(([title, items]) => ({
      title,
      data: items,
    }));
  }, [pages]);

  const onRefresh = useCallback(() => {
    setPages(new Map());
    if (cursor === null) {
      refetch();
    } else {
      setCursor(null);
    }
  }, [refetch, cursor]);

  const onPressItem = (item: FeedItem) => {
    if (!item.opened_at) {
      openDelivery.mutate({ deliveryId: item.delivery_id });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <SectionList
      style={{ backgroundColor: c.background }}
      sections={sections}
      keyExtractor={(item) => item.delivery_id}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        isFetching && cursor !== null ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />
        ) : null
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => {
        const unread = !item.opened_at;
        return (
          <Pressable
            onPress={() => onPressItem(item)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: unread ? c.accent : c.card,
                borderColor: c.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.itemHeader}>
              {unread && <View style={[styles.dot, { backgroundColor: c.primary }]} />}
              <Text
                style={[
                  styles.itemTitle,
                  {
                    color: c.foreground,
                    fontFamily: unread ? "Inter_600SemiBold" : "Inter_500Medium",
                  },
                ]}
                numberOfLines={2}
              >
                {item.deal.title}
              </Text>
            </View>
            {!!item.deal.description && (
              <Text
                style={[styles.itemDesc, { color: c.mutedForeground }]}
                numberOfLines={3}
              >
                {item.deal.description}
              </Text>
            )}
            <Text style={[styles.itemWhen, { color: c.mutedForeground }]}>
              {formatWhen(item.delivered_at)}
            </Text>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: c.accent }]}>
            <Feather name="bell" size={28} color={c.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>
            No activity yet
          </Text>
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            Deals and announcements from your businesses will show up here.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 120, flexGrow: 1 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 8,
  },
  item: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  itemHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  itemTitle: { fontSize: 15, flex: 1 },
  itemDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  itemWhen: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 8 },
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
});
