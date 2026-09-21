import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useUpdateLoyaltyProfile } from "@workspace/api-client-react";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ProfileForm, type ProfileFormValues } from "@/components/ProfileForm";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

export default function EditProfileScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { customer, updateCustomer } = useAuth();

  const [serverError, setServerError] = useState<string | null>(null);

  const update = useUpdateLoyaltyProfile({
    mutation: {
      onSuccess: async (data) => {
        await updateCustomer(data.customer);
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)/profile");
        }
      },
      onError: (err: any) =>
        setServerError(err?.data?.error || "Could not save your changes. Please try again."),
    },
  });

  const submit = (values: ProfileFormValues) => {
    setServerError(null);
    update.mutate({ data: values });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <Text style={[styles.title, { color: c.foreground }]}>
          Edit your profile
        </Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Keep your details up to date so deals and rewards stay relevant.
        </Text>

        <ProfileForm
          initialEmail={customer?.email || ""}
          initialDob={customer?.dob || ""}
          initialGender={customer?.gender || null}
          initialInterests={customer?.interests || []}
          submitLabel="Save changes"
          isSubmitting={update.isPending}
          serverError={serverError}
          onSubmit={submit}
        />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontFamily: "Inter_700Bold", fontSize: 24 },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 8,
  },
});
