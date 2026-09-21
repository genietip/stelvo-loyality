import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getGetWalletQueryKey, useJoinBusiness } from "@workspace/api-client-react";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

/** Pull a join code out of scanned QR data (raw code or URL ?code=/last segment). */
function extractCode(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const param = url.searchParams.get("code");
    if (param) return param.toUpperCase();
    const segs = url.pathname.split("/").filter(Boolean);
    if (segs.length > 0) return segs[segs.length - 1].toUpperCase();
  } catch {
    // Not a URL — treat as the code itself.
  }
  return trimmed.toUpperCase();
}

export default function JoinScreen() {
  const c = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { customer } = useAuth();
  const { code: prefill, error: initialError } = useLocalSearchParams<{
    code?: string;
    error?: string;
  }>();
  const [code, setCode] = useState(() =>
    typeof prefill === "string" ? prefill.trim().toUpperCase() : "",
  );

  useEffect(() => {
    if (typeof prefill === "string" && prefill.trim()) {
      setCode(prefill.trim().toUpperCase());
    }
  }, [prefill]);
  const [error, setError] = useState<string | null>(() =>
    typeof initialError === "string" && initialError.trim() ? initialError : null,
  );
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  const join = useJoinBusiness({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        router.back();
        // A customer who arrived via a join deep link skipped the one-time
        // marketing-profile prompt; show it now that the join is done.
        if (customer && !customer.profile_completed_at) {
          router.push("/complete-profile");
        }
      },
      onError: (err: any) => {
        scannedRef.current = false;
        setError(err?.data?.error || "That code didn't work. Check it and try again.");
      },
    },
  });

  const submit = (value: string) => {
    const clean = value.trim().toUpperCase();
    if (!clean) {
      setError("Enter an invite code.");
      return;
    }
    setError(null);
    join.mutate({ data: { code: clean } });
  };

  const startScan = async () => {
    setError(null);
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError("Camera access is needed to scan QR codes.");
        return;
      }
    }
    scannedRef.current = false;
    setScanning(true);
  };

  const canScan = Platform.OS !== "web";

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      {scanning && canScan ? (
        <View style={styles.scannerWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              if (scannedRef.current) return;
              scannedRef.current = true;
              setScanning(false);
              const extracted = extractCode(data);
              setCode(extracted);
              submit(extracted);
            }}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Point at the business's QR code</Text>
          </View>
          <Pressable
            onPress={() => setScanning(false)}
            style={[styles.cancelScan, { backgroundColor: c.background }]}
          >
            <Text style={[styles.cancelScanText, { color: c.foreground }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <View style={[styles.iconWrap, { backgroundColor: c.accent }]}>
            <Feather name="key" size={26} color={c.primary} />
          </View>
          <Text style={[styles.title, { color: c.foreground }]}>
            Enter an invite code
          </Text>
          <Text style={[styles.sub, { color: c.mutedForeground }]}>
            Ask the business for their Stelvo invite code, or scan their QR code.
          </Text>

          <TextInput
            style={[
              styles.input,
              { borderColor: c.input, color: c.foreground },
            ]}
            placeholder="e.g. K7X2M9PQ"
            placeholderTextColor={c.mutedForeground}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
          />

          {error && (
            <Text style={[styles.error, { color: c.destructive }]}>{error}</Text>
          )}

          <Pressable
            onPress={() => submit(code)}
            disabled={join.isPending}
            style={({ pressed }) => [
              styles.submit,
              { backgroundColor: c.primary, opacity: pressed || join.isPending ? 0.8 : 1 },
            ]}
          >
            {join.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Join business</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              router.back();
              router.push("/discover");
            }}
            style={({ pressed }) => [
              styles.scanBtn,
              { borderColor: c.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="compass" size={16} color={c.primary} />
            <Text style={[styles.scanBtnText, { color: c.primary }]}>
              Discover businesses
            </Text>
          </Pressable>

          {canScan && (
            <Pressable
              onPress={startScan}
              style={({ pressed }) => [
                styles.scanBtn,
                { borderColor: c.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="camera" size={16} color={c.primary} />
              <Text style={[styles.scanBtnText, { color: c.primary }]}>
                Scan QR code
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  form: { padding: 24, alignItems: "center" },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
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
  input: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 14,
  },
  error: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 10 },
  submit: {
    alignSelf: "stretch",
    borderRadius: colors.radius,
    paddingVertical: 15,
    alignItems: "center",
  },
  submitText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  scanBtn: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: colors.radius,
    paddingVertical: 14,
    marginTop: 12,
  },
  scanBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  scannerWrap: { flex: 1 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },
  scanHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#fff",
    marginTop: 16,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 4,
  },
  cancelScan: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  cancelScanText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
