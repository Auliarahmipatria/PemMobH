import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
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

  const resetForm = () => {
    setName("");
    setCategory("");
    setCondition("");
    setStartingPrice("");
    setImageUri(null);
    setError("");
  };

  const closeForm = () => {
    resetForm();
    onClose();
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

  const publishListing = () => {
    const amount = Number(startingPrice.replace(/\D/g, ""));

    if (!name.trim() || !category.trim() || !condition.trim() || amount <= 0 || !imageUri) {
      setError("Isi semua data dan pilih foto barang terlebih dahulu.");
      return;
    }

    onSubmit({
      name: name.trim(),
      category: category.trim(),
      condition: condition.trim(),
      seller: sellerName,
      price: `Rp${new Intl.NumberFormat("id-ID").format(amount)}`,
      image: imageUri,
    });
    closeForm();
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
              onChangeText={setName}
              maxLength={70}
            />
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.submitButton} onPress={publishListing}>
              <Text style={styles.submitText}>TERBITKAN BARANG</Text>
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
  error: {
    color: "#b42318",
    marginVertical: 4,
  },
  submitButton: {
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
