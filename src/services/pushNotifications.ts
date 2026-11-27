import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface AuctionNotificationTarget {
  id: number | string;
  source?: "api" | "bidly";
  name: string;
  price?: string;
  image?: string;
  category?: string;
  seller?: string;
  condition?: string;
}

export interface PushRegistrationResult {
  token: string;
  backendStatus: "registered" | "not-configured" | "failed";
  backendMessage?: string;
}

export interface ServerPushResult {
  accepted: number;
  registered: number;
  message: string;
}

function getPushApiBaseUrl() {
  const configuredUrl =
    process.env.EXPO_PUBLIC_PUSH_API_URL?.trim() ||
    Constants.expoConfig?.extra?.pushApiUrl;

  return typeof configuredUrl === "string" ? configuredUrl.replace(/\/+$/, "") : "";
}

async function ensureAuctionNotificationChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("auction-updates", {
    name: "Aktivitas lelang",
    description: "Bid baru, perubahan tawaran, dan pengingat lelang Bidly.",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: "#ff6b00",
  });
}

async function requestAuctionNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Izin notifikasi belum diberikan. Aktifkan izin Bidly di pengaturan perangkat.");
  }
}

export function configureAuctionNotifications() {
  if (Platform.OS === "web") return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  void ensureAuctionNotificationChannel().catch(() => {});
}

export async function getPushPermissionStatus() {
  if (Platform.OS === "web") return "unsupported";
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.granted ? "granted" : permissions.status;
}

async function registerTokenWithBackend(token: string, userEmail: string) {
  const baseUrl = getPushApiBaseUrl();
  if (!baseUrl) {
    return {
      backendStatus: "not-configured" as const,
      backendMessage: undefined,
    };
  }

  try {
    const response = await fetch(`${baseUrl}/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        userEmail,
        topics: ["auction-updates"],
      }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      return {
        backendStatus: "failed" as const,
        backendMessage:
          typeof result?.message === "string"
            ? result.message
            : `Server menolak pendaftaran token (${response.status}).`,
      };
    }

    return { backendStatus: "registered" as const, backendMessage: undefined };
  } catch (error) {
    return {
      backendStatus: "failed" as const,
      backendMessage:
        error instanceof Error ? error.message : "Server tidak bisa dihubungi.",
    };
  }
}

export async function sendServerAuctionNotification(
  userEmail: string,
  product: AuctionNotificationTarget
): Promise<ServerPushResult> {
  const baseUrl = getPushApiBaseUrl();
  if (!baseUrl) {
    throw new Error("Alamat backend belum diatur. Isi EXPO_PUBLIC_PUSH_API_URL di .env.local.");
  }

  const response = await fetch(`${baseUrl}/push/send-demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail, product }),
  });
  const result = await response.json().catch(() => null);

  if (!response.ok || result?.ok !== true) {
    throw new Error(
      typeof result?.message === "string"
        ? result.message
        : `Backend gagal mengirim push (${response.status}).`
    );
  }

  return {
    accepted: typeof result?.accepted === "number" ? result.accepted : 0,
    registered: typeof result?.registered === "number" ? result.registered : 0,
    message: typeof result?.message === "string" ? result.message : "Push diterima server.",
  };
}

export async function registerForAuctionPush(userEmail: string): Promise<PushRegistrationResult> {
  if (Platform.OS === "web") {
    throw new Error("Push notification Bidly perlu dijalankan di aplikasi Android atau iOS.");
  }

  await ensureAuctionNotificationChannel();
  await requestAuctionNotificationPermission();

  const projectId =
    Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    throw new Error("Project ID EAS tidak ditemukan di konfigurasi aplikasi.");
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const backend = await registerTokenWithBackend(token, userEmail);

  return { token, ...backend };
}

export async function scheduleAuctionNotificationDemo(product: AuctionNotificationTarget) {
  if (Platform.OS === "web") {
    throw new Error("Demo notifikasi hanya tersedia di aplikasi Android atau iOS.");
  }
  await ensureAuctionNotificationChannel();
  await requestAuctionNotificationPermission();

  const data: Record<string, string> = {
    productId: String(product.id),
    source: product.source ?? "bidly",
    name: product.name,
  };
  if (product.price) data.price = product.price;
  if (product.image) data.image = product.image;
  if (product.category) data.category = product.category;
  if (product.seller) data.seller = product.seller;
  if (product.condition) data.condition = product.condition;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔔 Ada aktivitas lelang di Bidly",
      body: `Ada bid baru untuk ${product.name}. Ketuk untuk melihat detail.`,
      data,
      ...(Platform.OS === "android" ? { channelId: "auction-updates" } : {}),
    },
    trigger: null,
  });
}
