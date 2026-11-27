import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import {
  AppState,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { PickupLocation } from "../models/Product";
import PickupMap from "./PickupMap";

const GEOFENCE_RADIUS_METERS = 500;

type PickupLocationCardProps = {
  pickupLocation: PickupLocation;
};

const distanceInMeters = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const value = Math.min(1,
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(first.latitude)) *
      Math.cos(toRadians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2
  );

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

export default function PickupLocationCard({ pickupLocation }: PickupLocationCardProps) {
  const [starting, setStarting] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [insideRadius, setInsideRadius] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const lastInsideRadius = useRef<boolean | null>(null);
  const mounted = useRef(true);

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      setMonitoring(false);
      return () => {
        mounted.current = false;
        subscription.current?.remove();
        subscription.current = null;
        lastInsideRadius.current = null;
      };
    }, [])
  );

  useEffect(() => {
    const appStateListener = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        subscription.current?.remove();
        subscription.current = null;
        lastInsideRadius.current = null;
        setMonitoring(false);
      }
    });

    return () => {
      appStateListener.remove();
      subscription.current?.remove();
      subscription.current = null;
    };
  }, []);

  const updateDistance = (coords: Location.LocationObjectCoords) => {
    const nextDistance = distanceInMeters(
      { latitude: coords.latitude, longitude: coords.longitude },
      pickupLocation
    );
    const nextInsideRadius = nextDistance <= GEOFENCE_RADIUS_METERS;

    setDistance(nextDistance);
    setInsideRadius(nextInsideRadius);

    if (
      lastInsideRadius.current !== null &&
      lastInsideRadius.current !== nextInsideRadius
    ) {
      Alert.alert(
        nextInsideRadius ? "Kamu masuk area COD" : "Kamu keluar dari area COD",
        nextInsideRadius
          ? `Kamu berada dalam radius ${GEOFENCE_RADIUS_METERS} m dari titik pengambilan.`
          : `Jarakmu sekarang lebih dari ${GEOFENCE_RADIUS_METERS} m dari titik pengambilan.`
      );
    }

    lastInsideRadius.current = nextInsideRadius;
  };

  const stopMonitoring = () => {
    subscription.current?.remove();
    subscription.current = null;
    lastInsideRadius.current = null;
    setMonitoring(false);
  };

  const startMonitoring = async () => {
    setStarting(true);
    setError("");
    lastInsideRadius.current = null;

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Izin lokasi diperlukan untuk memantau jarak ke titik COD.");
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        throw new Error("Aktifkan GPS/lokasi HP untuk mulai memantau jarak.");
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!mounted.current) return;
      updateDistance(current.coords);

      const nextSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 5000,
        },
        (location) => {
          if (mounted.current) updateDistance(location.coords);
        }
      );

      if (!mounted.current) {
        nextSubscription.remove();
        return;
      }

      subscription.current = nextSubscription;
      setMonitoring(true);
    } catch (requestError: unknown) {
      if (mounted.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Lokasi tidak dapat dipantau. Periksa izin dan GPS HP."
        );
      }
    } finally {
      if (mounted.current) setStarting(false);
    }
  };

  const statusText =
    distance === null
      ? ""
      : insideRadius
        ? `Kamu berada dalam radius COD (${formatDistance(distance)}).`
        : `Jarakmu ke titik COD: ${formatDistance(distance)}.`;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>📍 Lokasi COD / Pengambilan</Text>
      <Text style={styles.address}>{pickupLocation.address}</Text>
      <PickupMap coordinate={pickupLocation} height={220} />
      <Text style={styles.coordinates}>
        Lat {pickupLocation.latitude.toFixed(6)} · Lng {pickupLocation.longitude.toFixed(6)}
        {pickupLocation.accuracy !== null
          ? ` · Akurasi ±${Math.round(pickupLocation.accuracy)} m`
          : ""}
      </Text>

      <TouchableOpacity
        accessibilityRole="button"
        disabled={starting}
        onPress={() => {
          if (monitoring) stopMonitoring();
          else void startMonitoring();
        }}
        style={[styles.button, starting && styles.disabledButton]}
      >
        {starting ? <ActivityIndicator size="small" color="#ffffff" /> : null}
        <Text style={styles.buttonText}>
          {starting
            ? "Mengaktifkan..."
            : monitoring
              ? "Hentikan pantauan jarak"
              : "Cek / Pantau Jarak Saya"}
        </Text>
      </TouchableOpacity>

      {statusText ? (
        <Text style={[styles.status, insideRadius && styles.insideStatus]}>
          {statusText}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.note}>
        Pantauan radius 500 m hanya berjalan saat aplikasi terbuka dan halaman detail aktif. Keluar dari halaman atau pindah ke aplikasi lain akan menghentikannya.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  heading: { color: "#222", fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  address: { color: "#555", fontSize: 14, lineHeight: 20, marginBottom: 12 },
  coordinates: { color: "#777", fontSize: 11, lineHeight: 16, marginTop: 8 },
  button: {
    alignItems: "center",
    backgroundColor: "#1877d2",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  disabledButton: { opacity: 0.65 },
  buttonText: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
  status: {
    backgroundColor: "#fff7e6",
    borderRadius: 10,
    color: "#8a5200",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    padding: 10,
  },
  insideStatus: { backgroundColor: "#eaf8ef", color: "#167344" },
  error: { color: "#b42318", fontSize: 13, lineHeight: 18, marginTop: 10 },
  note: { color: "#777", fontSize: 11, lineHeight: 16, marginTop: 10 },
});
