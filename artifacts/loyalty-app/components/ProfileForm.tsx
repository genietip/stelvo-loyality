import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

import { LOYALTY_GENDERS as GENDERS, LOYALTY_INTERESTS as INTERESTS } from "@workspace/api-zod";

export interface ProfileFormValues {
  email: string;
  dob: string;
  gender: string;
  interests: string[];
}

function formatDob(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)];
  return parts.filter(Boolean).join("-");
}

interface ProfileFormProps {
  initialEmail?: string;
  initialDob?: string;
  initialGender?: string | null;
  initialInterests?: string[];
  submitLabel: string;
  isSubmitting: boolean;
  /** Error from the server (e.g. mutation failure); shown alongside validation errors. */
  serverError?: string | null;
  onSubmit: (values: ProfileFormValues) => void;
}

export function ProfileForm({
  initialEmail = "",
  initialDob = "",
  initialGender = null,
  initialInterests = [],
  submitLabel,
  isSubmitting,
  serverError,
  onSubmit,
}: ProfileFormProps) {
  const c = useColors();

  const [email, setEmail] = useState(initialEmail);
  const [dob, setDob] = useState(initialDob);
  const [gender, setGender] = useState<string | null>(initialGender);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [error, setError] = useState<string | null>(null);

  const displayedError = error || serverError || null;

  const toggleInterest = (i: string) => {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  };

  const submit = () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setError("Please enter your date of birth as YYYY-MM-DD.");
      return;
    }
    const d = new Date(dob);
    if (Number.isNaN(d.getTime()) || d > new Date() || d.getFullYear() < 1900) {
      setError("Please enter a valid date of birth.");
      return;
    }
    if (!gender) {
      setError("Please select a gender option.");
      return;
    }
    if (interests.length === 0) {
      setError("Pick at least one interest.");
      return;
    }
    onSubmit({ email: trimmedEmail, dob, gender, interests });
  };

  return (
    <View>
      <Text style={[styles.label, { color: c.foreground }]}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={c.mutedForeground}
        autoCapitalize="none"
        keyboardType="email-address"
        style={[
          styles.input,
          { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
        ]}
      />

      <Text style={[styles.label, { color: c.foreground }]}>Date of birth</Text>
      <TextInput
        value={dob}
        onChangeText={(v) => setDob(formatDob(v))}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={c.mutedForeground}
        keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
        maxLength={10}
        style={[
          styles.input,
          { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
        ]}
      />

      <Text style={[styles.label, { color: c.foreground }]}>Gender</Text>
      <View style={styles.chips}>
        {GENDERS.map((g) => {
          const active = gender === g;
          return (
            <Pressable
              key={g}
              onPress={() => setGender(g)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? c.primary : c.card,
                  borderColor: active ? c.primary : c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? "#fff" : c.foreground },
                ]}
              >
                {g}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: c.foreground }]}>
        What kinds of businesses interest you?
      </Text>
      <View style={styles.chips}>
        {INTERESTS.map((i) => {
          const active = interests.includes(i);
          return (
            <Pressable
              key={i}
              onPress={() => toggleInterest(i)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? c.primary : c.card,
                  borderColor: active ? c.primary : c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? "#fff" : c.foreground },
                ]}
              >
                {i}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {displayedError ? (
        <Text style={[styles.error, { color: c.destructive }]}>
          {displayedError}
        </Text>
      ) : null}

      <Pressable
        onPress={submit}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.submit,
          { backgroundColor: c.primary, opacity: pressed || isSubmitting ? 0.8 : 1 },
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{submitLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  error: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
  submit: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: colors.radius,
    paddingVertical: 15,
    marginTop: 24,
  },
  submitText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
