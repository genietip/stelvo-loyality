import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUpdateLoyaltyProfile } from "@workspace/api-client-react";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ProfileForm, type ProfileFormValues } from "@/components/ProfileForm";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

const BONUS_POINTS = 50;

export default function CompleteProfileScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { customer, updateCustomer } = useAuth();

  const [serverError, setServerError] = useState<string | null>(null);

  // Return to where the customer was (e.g. the business page they just
  // joined). Direct visits with no history still land on the wallet.
  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const update = useUpdateLoyaltyProfile({
    mutation: {
      onSuccess: async (data) => {
        await updateCustomer(data.customer);
        leave();
      },
      onError: (err: any) =>
        setServerError(err?.data?.error || "Could not save your profile. Please try again."),
    },
  });

  const submit = (values: ProfileFormValues) => {
    setServerError(null);
    update.mutate({ data: values });
  };

  const skip = () => leave();

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={[styles.bonusBanner, { backgroundColor: c.primary }]}>
          <Feather name="gift" size={20} color="#fff" />
          <Text style={styles.bonusText}>
            Complete your profile and earn {BONUS_POINTS} bonus points at every
            business in your wallet!
          </Text>
        </View>

        <Text style={[styles.title, { color: c.foreground }]}>
          Tell us a bit about you
        </Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          We use this to show you deals and rewards you'll actually love.
        </Text>

        <ProfileForm
          initialEmail={customer?.email || ""}
          submitLabel={`Complete profile & earn ${BONUS_POINTS} pts`}
          isSubmitting={update.isPending}
          serverError={serverError}
          onSubmit={submit}
        />

        <Pressable onPress={skip} style={styles.skip}>
          <Text style={[styles.skipText, { color: c.mutedForeground }]}>
            Maybe later
          </Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  bonusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  bonusText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
    color: "#fff",
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 24 },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  skip: { alignItems: "center", paddingVertical: 16 },
  skipText: { fontFamily: "Inter_500Medium", fontSize: 14 },
});
