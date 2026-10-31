
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import productsData from "../../data/products.json";
import type { Product } from "../../models/Product";
import {
  fetchApiProducts,
  type ApiProduct,
} from "../../services/productApi";

const localProducts = productsData as Product[];
const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function ProductDetail() {
  const params = useLocalSearchParams<{
    id: string;
    source?: string;
  }>();

  const id = Number(params.id);
  const isApiProduct = params.source === "api";

  console.log("PARAMS DETAIL:", params);
  console.log("ID:", id);
  console.log("IS API:", isApiProduct);

  const [apiProduct, setApiProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(isApiProduct);
  const [error, setError] = useState("");

  // Ambil detail produk dari API jika sumbernya API.
  useEffect(() => {
    if (!isApiProduct) return;

    const controller = new AbortController();

    fetchApiProducts(
  controller.signal,
  "https://dummyjson.com/products?limit=0"
)
      .then((items) => {
        if (controller.signal.aborted) return;

        const found = items.find((item) => item.id === id);

        if (found) {
          setApiProduct(found);
          setError("");
        } else {
          setError("Produk tidak ditemukan di API.");
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Gagal mengambil detail produk."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, isApiProduct]);

  // Produk lelang lama menggunakan data lokal.
  const localProduct = isApiProduct
    ? undefined
    : localProducts.find((item) => item.id === id);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff6b00" />
        <Text style={styles.info}>Memuat detail produk...</Text>
      </View>
    );
  }

  if (isApiProduct && apiProduct) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>🌐 Detail Produk API</Text>

        <Image
          source={{ uri: apiProduct.thumbnail }}
          style={styles.image}
          resizeMode="contain"
        />

        <Text style={styles.title}>{apiProduct.title}</Text>
        <Text style={styles.price}>
        {formatRupiah(apiProduct.price * 16000)}
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.info}>ID Produk: {apiProduct.id}</Text>
          <Text style={styles.info}>
            Kategori: {apiProduct.category}
          </Text>
          <Text style={styles.info}>
          Harga: {formatRupiah(apiProduct.price * 16000)}
        </Text>

          {"description" in apiProduct &&
            typeof apiProduct.description === "string" && (
              <Text style={styles.info}>
                Deskripsi: {apiProduct.description}
              </Text>
            )}

          {"brand" in apiProduct &&
            typeof apiProduct.brand === "string" && (
              <Text style={styles.info}>
                Merek: {apiProduct.brand}
              </Text>
            )}

          {"stock" in apiProduct &&
            typeof apiProduct.stock === "number" && (
              <Text style={styles.info}>
                Stok tersedia: {apiProduct.stock}
              </Text>
            )}

          {"rating" in apiProduct &&
            typeof apiProduct.rating === "number" && (
              <Text style={styles.info}>
                Rating: ⭐ {apiProduct.rating}
              </Text>
            )}

          {"discountPercentage" in apiProduct &&
            typeof apiProduct.discountPercentage === "number" && (
              <Text style={styles.info}>
                Diskon: {apiProduct.discountPercentage}%
              </Text>
            )}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>KEMBALI</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (!isApiProduct && localProduct) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>🔥 Detail Produk Bidly</Text>

        <Image
          source={{ uri: localProduct.image }}
          style={styles.image}
          resizeMode="cover"
        />

        <Text style={styles.title}>{localProduct.name}</Text>
        <Text style={styles.price}>{localProduct.price}</Text>

        <View style={styles.infoBox}>
          <Text style={styles.info}>ID Produk: {localProduct.id}</Text>
          <Text style={styles.info}>
            Kategori: {localProduct.category}
          </Text>
          <Text style={styles.info}>
            Penjual: {localProduct.seller}
          </Text>
          <Text style={styles.info}>
            Kondisi: {localProduct.condition}
          </Text>
          <Text style={styles.info}>
            Jumlah bidder: {localProduct.bidder}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>KEMBALI KE BERANDA</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.title}>
        {error || "Produk tidak ditemukan"}
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.buttonText}>KE BERANDA</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f7f8fc",
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f8fc",
    padding: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ff6b00",
    marginBottom: 20,
  },
  image: {
    width: "100%",
    height: 260,
    borderRadius: 20,
    marginBottom: 20,
    backgroundColor: "white",
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 12,
  },
  price: {
    color: "#ff6b00",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    gap: 12,
  },
  info: {
    fontSize: 16,
    color: "#333",
    marginTop: 8,
  },
  button: {
    backgroundColor: "#ff6b00",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
