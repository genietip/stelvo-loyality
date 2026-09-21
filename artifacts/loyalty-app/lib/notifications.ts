import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerLoyaltyPushToken } from "@workspace/api-client-react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for permission, fetch the Expo push token, and register it with the
 * server. Best-effort: silently no-ops on web, simulators, and Expo Go
 * (where remote push is unavailable).
 */
export async function registerForPushNotifications(): Promise<boolean> {
  if (Platform.OS === "web" || !Device.isDevice) return false;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Deals & rewards",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return false;

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;
    if (!token) return false;

    await registerLoyaltyPushToken({ token });
    return true;
  } catch {
    // Expo Go (SDK 53+) cannot fetch remote push tokens — fall back to the
    // in-app feed silently.
    return false;
  }
}

/** Clear this device's push token on the server (e.g. on logout / toggle off). */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    await registerLoyaltyPushToken({ token: null });
  } catch {
    // Best-effort.
  }
}
