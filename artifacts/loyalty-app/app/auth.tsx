import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useLoyaltyCustomerLogin,
  useLoyaltyCustomerSignup,
} from "@workspace/api-client-react";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { registerForPushNotifications } from "@/lib/notifications";
import { routeAfterAuth } from "@/lib/post-auth";

type Mode = "login" | "signup";
type Method = "email" | "phone";

export default function AuthScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signIn } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [method, setMethod] = useState<Method>("email");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSuccess = async (data: { token: string; customer: any }) => {
    await signIn(data.token, data.customer);
    await routeAfterAuth(router, queryClient, data.customer);
    registerForPushNotifications();
  };

  const login = useLoyaltyCustomerLogin({
    mutation: {
      onSuccess,
      onError: (err: any) =>
        setError(err?.data?.error || "Login failed. Check your details."),
    },
  });
  const signup = useLoyaltyCustomerSignup({
    mutation: {
      onSuccess,
      onError: (err: any) =>
        setError(err?.data?.error || "Sign up failed. Please try again."),
    },
  });

  const busy = login.isPending || signup.isPending;

  const submit = () => {
    setError(null);
    const id = identifier.trim();
    if (!id || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "login") {
      login.mutate({ data: { identifier: id, password } });
    } else {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }
      signup.mutate({
        data: {
          name: name.trim(),
          password,
          email: method === "email" ? id : null,
          phone: method === "phone" ? id : null,
        },
      });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <LinearGradient
        colors={["#7c3aed", "#5b21b6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 48 }]}
      >
        <View style={styles.logoBadge}>
          <Text style={styles.logoStar}>✦</Text>
        </View>
        <Text style={styles.heroTitle}>Stelvo Loyalty</Text>
        <Text style={styles.heroSub}>
          Earn points and unlock rewards at your favorite local spots
        </Text>
      </LinearGradient>

      <KeyboardAwareScrollViewCompat
        style={styles.form}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.segment, { backgroundColor: c.muted }]}>
          {(["login", "signup"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setError(null);
              }}
              style={[
                styles.segmentBtn,
                mode === m && { backgroundColor: c.background },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: mode === m ? c.primary : c.mutedForeground },
                ]}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === "signup" && (
          <>
            <Text style={[styles.label, { color: c.foreground }]}>Your name</Text>
            <TextInput
              style={[styles.input, { borderColor: c.input, color: c.foreground }]}
              placeholder="Jane Doe"
              placeholderTextColor={c.mutedForeground}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <View style={[styles.segment, styles.methodSegment, { backgroundColor: c.muted }]}>
              {(["email", "phone"] as Method[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMethod(m)}
                  style={[
                    styles.segmentBtn,
                    method === m && { backgroundColor: c.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: method === m ? c.primary : c.mutedForeground },
                    ]}
                  >
                    {m === "email" ? "Email" : "Phone"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.label, { color: c.foreground }]}>
          {mode === "login"
            ? "Email or phone"
            : method === "email"
              ? "Email address"
              : "Phone number"}
        </Text>
        <TextInput
          style={[styles.input, { borderColor: c.input, color: c.foreground }]}
          placeholder={
            mode === "login"
              ? "you@example.com or 555-123-4567"
              : method === "email"
                ? "you@example.com"
                : "555-123-4567"
          }
          placeholderTextColor={c.mutedForeground}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          keyboardType={
            mode === "signup" && method === "phone" ? "phone-pad" : "email-address"
          }
        />

        <Text style={[styles.label, { color: c.foreground }]}>Password</Text>
        <TextInput
          style={[styles.input, { borderColor: c.input, color: c.foreground }]}
          placeholder="••••••••"
          placeholderTextColor={c.mutedForeground}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={busy}
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: c.primary, opacity: pressed || busy ? 0.8 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {mode === "login" ? "Log in" : "Create account"}
            </Text>
          )}
        </Pressable>

        <View style={[styles.bizDivider, { borderColor: c.border }]} />
        <Text style={[styles.bizPrompt, { color: c.mutedForeground }]}>
          Own a business?
        </Text>
        <Pressable
          onPress={() =>
            Linking.openURL(`https://${process.env.EXPO_PUBLIC_DOMAIN}/signup`)
          }
          style={({ pressed }) => [
            styles.bizLink,
            { borderColor: c.primary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.bizLinkText, { color: c.primary }]}>
            Register your business on Stelvo
          </Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingBottom: 36,
    paddingHorizontal: 28,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoStar: { fontSize: 30, color: "#fff" },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#fff",
    marginBottom: 6,
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 20,
  },
  form: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  segment: {
    flexDirection: "row",
    borderRadius: colors.radius,
    padding: 4,
    marginBottom: 20,
  },
  methodSegment: { marginTop: 4 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: colors.radius - 4,
    alignItems: "center",
  },
  segmentText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 12 : 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    marginBottom: 16,
  },
  error: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginBottom: 12,
  },
  submit: {
    borderRadius: colors.radius,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  bizDivider: { borderTopWidth: 1, marginTop: 28, marginBottom: 20 },
  bizPrompt: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  bizLink: {
    borderWidth: 1.5,
    borderRadius: colors.radius,
    paddingVertical: 12,
    alignItems: "center",
  },
  bizLinkText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
