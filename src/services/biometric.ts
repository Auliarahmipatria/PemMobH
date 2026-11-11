import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Kunci penyimpanan aman: menyimpan email akun yang sudah mengaktifkan biometrik.
const BIOMETRIC_EMAIL_KEY = "bidly_biometric_email";

// Cek apakah perangkat punya sensor DAN sudah ada sidik jari / wajah terdaftar.
// Di web (laptop) fitur ini tidak didukung, jadi otomatis false.
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

// Nama sensor untuk label tombol: "Sidik Jari", "Face ID", atau "Biometrik".
export async function getBiometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFace = types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
    );
    const hasFinger = types.includes(
      LocalAuthentication.AuthenticationType.FINGERPRINT
    );

    if (hasFace && hasFinger) return "Sidik Jari / Wajah";
    if (hasFace) return "Face ID";
    if (hasFinger) return "Sidik Jari";
  } catch {
    // abaikan, pakai label umum
  }
  return "Biometrik";
}

// Munculkan prompt sensor. Mengembalikan true jika verifikasi berhasil.
export async function authenticateBiometric(
  promptMessage: string
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Batal",
      disableDeviceFallback: Platform.OS === "ios",
      fallbackLabel: Platform.OS === "ios" ? "" : undefined,
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function getSavedBiometricEmail(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    return await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function saveBiometricEmail(email: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
  } catch {
    // gagal menyimpan: biometrik tidak aktif, login password tetap jalan
  }
}

export async function clearBiometric(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
  } catch {
    // abaikan
  }
}
