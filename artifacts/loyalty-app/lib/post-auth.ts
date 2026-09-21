import type { QueryClient } from "@tanstack/react-query";
import type { useRouter } from "expo-router";

import {
  getGetWalletQueryKey,
  joinBusiness,
  type LoyaltyCustomer,
} from "@workspace/api-client-react";

import { consumePendingJoinCode } from "@/lib/pending-join-code";

type Router = ReturnType<typeof useRouter>;

/**
 * Route a freshly authenticated customer to the right place.
 *
 * If a join deep link was scanned while logged out, finish the join
 * automatically and land on the business page with a confirmation; on a bad
 * code, fall back to the join screen pre-filled with an error. Otherwise show
 * the one-time profile prompt or the wallet.
 */
export async function routeAfterAuth(
  router: Router,
  queryClient: QueryClient,
  customer: Pick<LoyaltyCustomer, "profile_completed_at"> | null | undefined,
): Promise<void> {
  const pendingCode = await consumePendingJoinCode();
  if (pendingCode) {
    try {
      const reply = await joinBusiness({ code: pendingCode });
      await queryClient.invalidateQueries({
        queryKey: getGetWalletQueryKey(),
      });
      router.replace("/(tabs)");
      router.push({
        pathname: "/business/[merchantId]",
        params: { merchantId: reply.membership.merchant_id, joined: "1" },
      });
      // A customer who arrived via a join deep link skipped the one-time
      // marketing-profile prompt; show it on top of the business page.
      if (customer && !customer.profile_completed_at) {
        router.push("/complete-profile");
      }
    } catch (err: any) {
      // Bad or expired code: fall back to the join screen, pre-filled.
      router.replace("/(tabs)");
      router.push({
        pathname: "/join",
        params: {
          code: pendingCode,
          error:
            err?.data?.error || "That code didn't work. Check it and try again.",
        },
      });
    }
    return;
  }
  if (customer && !customer.profile_completed_at) {
    // New or returning sign-in: prompt for the marketing profile once.
    router.replace("/complete-profile");
  } else {
    router.replace("/(tabs)");
  }
}
