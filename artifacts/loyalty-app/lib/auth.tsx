import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  setAuthTokenGetter,
  type LoyaltyCustomer,
} from "@workspace/api-client-react";

const TOKEN_KEY = "stelvo_loyalty_token";
const CUSTOMER_KEY = "stelvo_loyalty_customer";

// Module-level token so the API client can read it synchronously.
let currentToken: string | null = null;
setAuthTokenGetter(() => currentToken);

interface AuthContextValue {
  token: string | null;
  customer: LoyaltyCustomer | null;
  loading: boolean;
  signIn: (token: string, customer: LoyaltyCustomer) => Promise<void>;
  signOut: () => Promise<void>;
  updateCustomer: (customer: LoyaltyCustomer) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<LoyaltyCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedCustomer] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(CUSTOMER_KEY),
        ]);
        if (storedToken) {
          currentToken = storedToken;
          setToken(storedToken);
          if (storedCustomer) {
            setCustomer(JSON.parse(storedCustomer) as LoyaltyCustomer);
          }
        }
      } catch {
        // Corrupt storage — start signed out.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(
    async (newToken: string, newCustomer: LoyaltyCustomer) => {
      currentToken = newToken;
      setToken(newToken);
      setCustomer(newCustomer);
      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, newToken),
        AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(newCustomer)),
      ]);
    },
    [],
  );

  const updateCustomer = useCallback(async (newCustomer: LoyaltyCustomer) => {
    setCustomer(newCustomer);
    await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(newCustomer));
  }, []);

  const signOut = useCallback(async () => {
    currentToken = null;
    setToken(null);
    setCustomer(null);
    queryClient.clear();
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(CUSTOMER_KEY),
    ]);
  }, [queryClient]);

  const value = useMemo(
    () => ({ token, customer, loading, signIn, signOut, updateCustomer }),
    [token, customer, loading, signIn, signOut, updateCustomer],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
