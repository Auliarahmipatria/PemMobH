import { useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  View,
} from "react-native";
import type { Product } from "../models/Product";
import type { PickupCoordinates, PickupLocation } from "../models/Product";
import { createApiProduct, fetchPriceReference } from "../services/productApi";
import type { PriceReference } from "../services/productApi";
import PickupMap from "./PickupMap";

type ListingDraft = Omit<Product, "id" | "bidder">;

type CreateListingModalProps = {
  visible: boolean;
  sellerName: string;
  onClose: () => void;
  onSubmit: (listing: ListingDraft) => void;
};

export default function CreateListingModal({
  visible,
  sellerName,
  onClose,
  onSubmit,
}: CreateListingModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [listingLoading, setListingLoading] = useState(false);
  const [priceLookupLoading, setPriceLookupLoading] = useState(false);
  const [priceLookupError, setPriceLookupError] = useState("");
  const [priceReference, setPriceReference] = useState<PriceReference | null>(null);
  const priceRequest = useRef<AbortController | null>(null);
  const listingRequest = useRef<AbortController | null>(null);
  const [pickupLocation, setPickupLocation] = useState<PickupLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const addressRequestId = useRef(0);
  const locationRequestId = useRef(0);

  const resetForm = () => {
    setName("");
    setCategory("");
    setCondition("");
    setStartingPrice("");
    setImageUri(null);
    setError("");
    setListingLoading(false);
    setPriceLookupLoading(false);
    setPriceLookupError("");
    setPriceReference(null);
    addressRequestId.current += 1;
    locationRequestId.current += 1;
    setPickupLocation(null);
    setLocationLoading(false);
    setAddressLoading(false);
    setLocationError("");
  };

  const closeForm = () => {
    priceRequest.current?.abort();
    listingRequest.current?.abort();
    resetForm();
    onClose();
  };

  const checkPriceReference = () => {
    priceRequest.current?.abort();
    const controller = new AbortController();
    priceRequest.current = controller;

    setPriceLookupLoading(true);
    setPriceLookupError("");
    setPriceReference(null);

    fetchPriceReference(name, controller.signal)
      .then((reference) => {
        if (!controller.signal.aborted) setPriceReference(reference);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setPriceLookupError(
          requestError instanceof Error
            ? requestError.message
            : "Referensi harga tidak dapat dimuat. Coba lagi."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPriceLookupLoading(false);
      });
  };

  const getSuggestedStartingPrice = () => {
    if (!priceReference) return 0;
    // Harga DummyJSON berdenominasi USD; kurs Rp16.000 dipakai sebagai estimasi demo.
    const averagePriceRupiah = priceReference.averagePriceUsd * 16000;
    return Math.round((averagePriceRupiah * 0.7) / 1000) * 1000;
  };

  const updatePickupCoordinate = async (
    coordinate: PickupCoordinates,
    accuracy: number | null = null
  ) => {
    const requestId = ++addressRequestId.current;
    const coordinateAddress = `Koordinat ${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;

    setPickupLocation({ ...coordinate, accuracy, address: coordinateAddress });
    setLocationError("");
    setAddressLoading(true);

    try {
      const [address] = await Location.reverseGeocodeAsync(coordinate);
      if (requestId !== addressRequestId.current) return;

      const street = [address?.street, address?.streetNumber]
        .filter(Boolean)
        .join(" ");
      const parts = [
        street,
        address?.district,
        address?.subregion,
        address?.city,
        address?.region,
        address?.postalCode,
      ].filter((part): part is string => Boolean(part));
      const uniqueParts = [...new Set(parts)];
      const readableAddress = uniqueParts.join(", ");

      setPickupLocation((current) =>
        current
          ? { ...current, address: readableAddress || coordinateAddress }
          : current
      );
    } catch {
      if (requestId === addressRequestId.current) {
        setLocationError("Alamat tidak berhasil dicari. Titik koordinat tetap tersimpan.");
      }
    } finally {
      if (requestId === addressRequestId.current) setAddressLoading(false);
    }
  };

  const useCurrentPickupLocation = async () => {
    const requestId = ++locationRequestId.current;
    setLocationLoading(true);
    setLocationError("");

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (requestId !== locationRequestId.current) return;
      if (!permission.granted) {
        throw new Error("Izin lokasi ditolak. Aktifkan izin lokasi untuk menentukan titik COD.");
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (requestId !== locationRequestId.current) return;
      if (!servicesEnabled) {
        throw new Error("Layanan lokasi/GPS belum aktif di HP.");
      }

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (requestId !== locationRequestId.current) return;

      await updatePickupCoordinate(
        {
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        },
        result.coords.accuracy
      );
    } catch (requestError: unknown) {
      if (requestId === locationRequestId.current) {
        setLocationError(
          requestError instanceof Error
            ? requestError.message
            : "Lokasi tidak bisa diambil. Periksa GPS dan coba lagi."
        );
      }
    } finally {
      if (requestId === locationRequestId.current) setLocationLoading(false);
    }
  };

  const choosePhoto = async () => {
    setError("");

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      setError("Foto tidak bisa dibuka. Silakan coba lagi.");
    }
  };

  const takePhoto = async () => {
    setError("");

    try {
      // Browser harus membuka kamera langsung dari aksi pengguna.
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError("Izinkan akses kamera untuk mengambil foto barang.");
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      setError("Kamera tidak bisa dibuka. Silakan coba lagi.");
    }
  };

  const publishListing = async () => {
    const amount = Number(startingPrice.replace(/\D/g, ""));

    if (!name.trim() || !category.trim() || !condition.trim() || amount <= 0 || !imageUri) {
      setError("Isi semua data dan pilih foto barang terlebih dahulu.");
      return;
    }

    const controller = new AbortController();
    listingRequest.current?.abort();
    listingRequest.current = controller;
    setListingLoading(true);
    setError("");

    try {
      // Kirim metadata dasar saja; foto lokal dan koordinat COD tidak dikirim ke katalog latihan.
      await createApiProduct(
        { title: name.trim(), price: amount, category: category.trim() },
        controller.signal
      );
      if (controller.signal.aborted) return;

      onSubmit({
        name: name.trim(),
        category: category.trim(),
        condition: condition.trim(),
        seller: sellerName,
        price: `Rp${new Intl.NumberFormat("id-ID").format(amount)}`,
        image: imageUri,
        pickupLocation: pickupLocation ?? undefined,
      });
      closeForm();
    } catch (requestError: unknown) {
      if (controller.signal.aborted) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Barang gagal dikirim. Periksa koneksi lalu coba lagi."
      );
    } finally {
      if (!controller.signal.aborted) {
        setListingLoading(false);
        listingRequest.current = null;
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={closeForm}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Jual Barang</Text>
            <Text style={styles.subtitle}>
              Tambahkan detail dan foto barang yang akan dilelang.
            </Text>

            <TouchableOpacity style={styles.photoButton} onPress={choosePhoto}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIcon}>＋</Text>
                  <Text style={styles.photoText}>Pilih Foto Barang</Text>
                  <Text style={styles.photoHint}>Pilih foto atau ambil langsung</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoAction} onPress={choosePhoto}>
                <Text style={styles.photoActionText}>🖼️ Pilih dari Galeri</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoAction} onPress={takePhoto}>
                <Text style={styles.photoActionText}>📷 Ambil Foto</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nama barang"
              value={name}
              onChangeText={(value) => {
                setName(value);
                setPriceReference(null);
                setPriceLookupError("");
              }}
              maxLength={70}
              editable={!priceLookupLoading}
            />
            <TouchableOpacity
              disabled={name.trim().length < 2 || priceLookupLoading}
              onPress={checkPriceReference}
              style={[
                styles.priceLookupButton,
                (name.trim().length < 2 || priceLookupLoading) && styles.disabledButton,
              ]}
            >
              {priceLookupLoading ? (
                <ActivityIndicator size="small" color="#ff6b00" />
              ) : null}
              <Text style={styles.priceLookupText}>
                {priceLookupLoading ? "Mencari referensi..." : "🔎 Cek referensi harga"}
              </Text>
            </TouchableOpacity>
            {priceLookupError ? (
              <Text style={styles.error}>{priceLookupError}</Text>
            ) : null}
            {priceReference ? (
              <View style={styles.priceReferenceCard}>
                <Text style={styles.priceReferenceTitle}>
                  Referensi dari {priceReference.matches} produk serupa
                </Text>
                <Text style={styles.priceReferenceText}>
                  Rata-rata katalog: Rp{new Intl.NumberFormat("id-ID").format(
                    Math.round(priceReference.averagePriceUsd * 16000)
                  )}
                </Text>
                <Text style={styles.priceReferenceText}>
                  Saran harga awal (70%): Rp{new Intl.NumberFormat("id-ID").format(
                    getSuggestedStartingPrice()
                  )}
                </Text>
                <Text style={styles.priceReferenceSamples}>
                  Contoh: {priceReference.sampleNames.join(", ")}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setStartingPrice(new Intl.NumberFormat("id-ID").format(getSuggestedStartingPrice()))
                  }
                  style={styles.useSuggestionButton}
                >
                  <Text style={styles.useSuggestionText}>Pakai saran harga awal</Text>
                </TouchableOpacity>
                <Text style={styles.priceReferenceNote}>
                  Hanya estimasi katalog demo, bukan harga pasar real-time.
                </Text>
              </View>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Kategori, misalnya Elektronik"
              value={category}
              onChangeText={setCategory}
              maxLength={35}
            />
            <TextInput
              style={styles.input}
              placeholder="Kondisi, misalnya Bekas - bagus"
              value={condition}
              onChangeText={setCondition}
              maxLength={50}
            />
            <TextInput
              style={styles.input}
              placeholder="Harga awal (Rp)"
              value={startingPrice}
              onChangeText={setStartingPrice}
              keyboardType="numeric"
            />

            <View style={styles.pickupSection}>
              <Text style={styles.pickupTitle}>📍 Lokasi COD / Pengambilan (opsional)</Text>
              <Text style={styles.pickupHint}>
                Lokasi ini terlihat oleh pembeli. Pilih tempat umum jika tidak ingin membagikan alamat rumah.
              </Text>
              <TouchableOpacity
                disabled={locationLoading}
                onPress={() => void useCurrentPickupLocation()}
                style={[styles.locationButton, locationLoading && styles.disabledButton]}
              >
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#ff6b00" />
                ) : null}
                <Text style={styles.locationButtonText}>
                  {locationLoading
                    ? "Mengambil lokasi..."
                    : pickupLocation
                      ? "Perbarui dengan Lokasi HP"
                      : "Gunakan Lokasi HP"}
                </Text>
              </TouchableOpacity>

              {locationError ? (
                <Text style={styles.locationError}>{locationError}</Text>
              ) : null}

              {pickupLocation ? (
                <View style={styles.pickupPreview}>
                  <PickupMap
                    coordinate={pickupLocation}
                    onCoordinateChange={(coordinate) =>
                      void updatePickupCoordinate(coordinate)
                    }
                    height={190}
                  />
                  <Text style={styles.pickupAddress}>
                    {addressLoading ? "Mencari alamat..." : pickupLocation.address}
                  </Text>
                  <Text style={styles.pickupCoordinates}>
                    Lat {pickupLocation.latitude.toFixed(6)} · Lng {pickupLocation.longitude.toFixed(6)}
                    {pickupLocation.accuracy !== null
                      ? ` · Akurasi ±${Math.round(pickupLocation.accuracy)} m`
                      : " · Pin dipilih manual"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      addressRequestId.current += 1;
                      setPickupLocation(null);
                      setAddressLoading(false);
                      setLocationError("");
                    }}
                    style={styles.removeLocationButton}
                  >
                    <Text style={styles.removeLocationText}>Hapus titik COD</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.priceReferenceNote}>
              Metadata listing dikirim dengan POST ke DummyJSON untuk latihan. Endpoint demo tidak menyimpan listing secara permanen; foto dan lokasi COD tetap hanya di aplikasi, sedangkan listing lokal hilang saat aplikasi dimulai ulang.
            </Text>

            <TouchableOpacity
              disabled={listingLoading}
              style={[styles.submitButton, listingLoading && styles.disabledButton]}
              onPress={() => void publishListing()}
            >
              {listingLoading ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={styles.submitText}>
                {listingLoading ? "MENGIRIM LISTING..." : "TERBITKAN BARANG"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={closeForm}>
              <Text style={styles.cancelText}>BATAL</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "92%",
    borderRadius: 24,
    backgroundColor: "#f7f8fc",
    overflow: "hidden",
  },
  content: {
    padding: 22,
  },
  title: {
    color: "#222",
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#666",
    marginTop: 5,
    marginBottom: 16,
  },
  photoButton: {
    height: 180,
    borderWidth: 1,
    borderColor: "#ffd2b3",
    borderStyle: "dashed",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "white",
    marginBottom: 14,
  },
  photoPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoIcon: {
    color: "#ff6b00",
    fontSize: 34,
    fontWeight: "bold",
  },
  photoText: {
    color: "#333",
    fontWeight: "bold",
    marginTop: 5,
  },
  photoHint: {
    color: "#777",
    fontSize: 12,
    marginTop: 4,
  },
  photoActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  photoAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffd2b3",
    backgroundColor: "white",
  },
  photoActionText: {
    color: "#ff6b00",
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    fontSize: 15,
  },
  priceLookupButton: {
    minHeight: 44,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffd2b3",
    backgroundColor: "#fff8f3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  priceLookupText: {
    color: "#e85e00",
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.55,
  },
  priceReferenceCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cdebdc",
    backgroundColor: "#f2fbf6",
    padding: 13,
    marginBottom: 12,
  },
  priceReferenceTitle: {
    color: "#176b45",
    fontWeight: "bold",
    marginBottom: 5,
  },
  priceReferenceText: {
    color: "#333",
    marginTop: 3,
  },
  priceReferenceSamples: {
    color: "#666",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  useSuggestionButton: {
    alignItems: "center",
    backgroundColor: "#e3f5eb",
    borderRadius: 10,
    marginTop: 10,
    paddingVertical: 10,
  },
  useSuggestionText: {
    color: "#176b45",
    fontWeight: "bold",
  },
  priceReferenceNote: {
    color: "#777",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
  },
  pickupSection: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e5e5",
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 12,
    padding: 13,
  },
  pickupTitle: {
    color: "#333",
    fontSize: 15,
    fontWeight: "bold",
  },
  pickupHint: {
    color: "#777",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 10,
  },
  locationButton: {
    alignItems: "center",
    backgroundColor: "#fff8f3",
    borderColor: "#ffd2b3",
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  locationButtonText: { color: "#e85e00", fontSize: 13, fontWeight: "bold" },
  locationError: { color: "#b42318", fontSize: 12, lineHeight: 17, marginTop: 8 },
  pickupPreview: { marginTop: 12 },
  pickupAddress: { color: "#333", fontSize: 13, fontWeight: "600", marginTop: 10 },
  pickupCoordinates: { color: "#777", fontSize: 11, lineHeight: 16, marginTop: 4 },
  removeLocationButton: { alignSelf: "flex-start", paddingVertical: 9 },
  removeLocationText: { color: "#b42318", fontSize: 12, fontWeight: "600" },
  error: {
    color: "#b42318",
    marginVertical: 4,
  },
  submitButton: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#ff6b00",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 6,
  },
  submitText: {
    color: "white",
    fontWeight: "bold",
  },
  cancelButton: {
    alignItems: "center",
    padding: 14,
    marginTop: 4,
  },
  cancelText: {
    color: "#666",
    fontWeight: "bold",
  },
});
