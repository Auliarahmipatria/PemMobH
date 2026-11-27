import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import type { Product } from "../models/Product";
import {
  getPushPermissionStatus,
  registerForAuctionPush,
  sendServerAuctionNotification,
  scheduleAuctionNotificationDemo,
} from "../services/pushNotifications";

interface PushNotificationCardProps {
  userEmail: string;
  demoProduct?: Product;
}

export default function PushNotificationCard({
  userEmail,
  demoProduct,
}: PushNotificationCardProps) {
  const [permissionStatus, setPermissionStatus] = useState("memeriksa");
  const [token, setToken] = useState("");
  const [backendRegistered, setBackendRegistered] = useState(false);
  const [backendMessage, setBackendMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPushPermissionStatus()
      .then((status) => {
        if (active) setPermissionStatus(status);
      })
      .catch(() => {
        if (active) setPermissionStatus("belum diketahui");
      });

    return () => {
      active = false;
    };
  }, []);

  const enableNotifications = async () => {
    setBusy(true);
    setBackendRegistered(false);
    setError("");
    setBackendMessage("");
    try {
      const result = await registerForAuctionPush(userEmail);
      setToken(result.token);
      setBackendRegistered(result.backendStatus === "registered");
      setPermissionStatus("granted");
      setBackendMessage(
        result.backendStatus === "registered"
          ? "Token berhasil didaftarkan ke server Bidly."
          : result.backendStatus === "failed"
            ? `Token didapat, tetapi server belum menerima pendaftaran. ${result.backendMessage ?? ""}`
            : "Token didapat. Atur URL backend di .env.local agar token bisa didaftarkan ke server."
      );
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : "Pendaftaran notifikasi gagal. Coba lagi."
      );
    } finally {
      setBusy(false);
    }
  };

  const sendServerDemoNotification = async () => {
    if (!demoProduct) return;
    setBusy(true);
    setError("");
    setBackendMessage("");
    try {
      const result = await sendServerAuctionNotification(userEmail, {
        ...demoProduct,
        source: "bidly",
      });
      setBackendMessage(result.message);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Push dari server gagal dikirim."
      );
    } finally {
      setBusy(false);
    }
  };

  const sendDemoNotification = async () => {
    if (!demoProduct) return;
    setBusy(true);
    setError("");
    try {
      await scheduleAuctionNotificationDemo({ ...demoProduct, source: "bidly" });
      setBackendMessage("Notifikasi demo dijadwalkan. Ketuk notifikasi untuk membuka detail produk.");
    } catch (demoError) {
      setError(
        demoError instanceof Error ? demoError.message : "Notifikasi demo gagal dibuat."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🔔 Notifikasi Aktivitas Lelang</Text>
      <Text style={styles.description}>
        Daftarkan perangkat untuk push dan buka produk terkait langsung dari notifikasi.
      </Text>
      <Text style={styles.status}>
        Status izin: {Platform.OS === "web" ? "gunakan aplikasi Android/iOS" : permissionStatus}
      </Text>

      <TouchableOpacity
        accessibilityRole="button"
        disabled={busy || Platform.OS === "web"}
        style={[styles.primaryButton, (busy || Platform.OS === "web") && styles.disabledButton]}
        onPress={enableNotifications}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>AKTIFKAN PUSH</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        disabled={busy || !demoProduct || Platform.OS === "web"}
        style={[styles.demoButton, (busy || !demoProduct || Platform.OS === "web") && styles.disabledDemoButton]}
        onPress={sendDemoNotification}
      >
        <Text style={styles.demoButtonText}>KIRIM NOTIFIKASI DEMO (LOKAL)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        disabled={busy || !demoProduct || Platform.OS === "web" || !backendRegistered}
        style={[
          styles.serverDemoButton,
          (busy || !demoProduct || Platform.OS === "web" || !backendRegistered) &&
            styles.disabledDemoButton,
        ]}
        onPress={sendServerDemoNotification}
      >
        <Text style={styles.serverDemoButtonText}>KIRIM PUSH DEMO VIA SERVER</Text>
      </TouchableOpacity>

      {backendMessage ? <Text style={styles.message}>{backendMessage}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {token ? (
        <View style={styles.tokenBox}>
          <Text style={styles.tokenTitle}>Expo Push Token</Text>
          <Text selectable style={styles.token}>{token}</Text>
        </View>
      ) : null}
      <Text style={styles.footnote}>
        Demo lokal hanya di perangkat ini. Push server menguji pengiriman jarak jauh; notifikasi otomatis dari bid perlu event backend.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff7f0",
    borderColor: "#ffd5b5",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  title: { color: "#9c3e00", fontSize: 17, fontWeight: "800" },
  description: { color: "#593f32", fontSize: 13, lineHeight: 19, marginTop: 6 },
  status: { color: "#674b3c", fontSize: 12, marginTop: 8 },
  primaryButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#ff6b00",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryButtonText: { color: "white", fontSize: 13, fontWeight: "800" },
  demoButton: {
    minHeight: 42,
    borderRadius: 12,
    borderColor: "#ff6b00",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  demoButtonText: { color: "#b84b00", fontSize: 12, fontWeight: "800" },
  serverDemoButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#593f32",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  serverDemoButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  disabledButton: { opacity: 0.55 },
  disabledDemoButton: { opacity: 0.45 },
  message: { color: "#23643c", fontSize: 12, lineHeight: 17, marginTop: 10 },
  error: { color: "#b42318", fontSize: 12, lineHeight: 17, marginTop: 10 },
  tokenBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  tokenTitle: { color: "#593f32", fontSize: 11, fontWeight: "700", marginBottom: 4 },
  token: { color: "#344054", fontSize: 11, lineHeight: 16 },
  footnote: { color: "#7a675d", fontSize: 11, lineHeight: 16, marginTop: 10 },
});
