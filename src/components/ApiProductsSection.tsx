import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";

import {
  fetchApiProducts,
  ProductApiError
} from "../services/productApi";

import type { ApiProduct } from "../services/productApi";

type Status = "loading" | "success" | "error";

type BidInfo = {
  amount: number;
  bidders: number;
};

const API_URL = "https://dummyjson.com/products";
const LIMIT = 6;
const STORAGE_KEY = "bidly_last_fashion_electronic_ids";

const FASHION_CATEGORIES = [
  "mens-shirts",
  "mens-shoes",
  "mens-watches",
  "womens-dresses",
  "womens-shoes",
  "womens-watches",
  "womens-bags",
  "womens-jewellery",
  "tops",
  "sunglasses"
];

const ELECTRONIC_CATEGORIES = [
  "smartphones",
  "laptops",
  "tablets",
  "mobile-accessories"
];

const ALLOWED_CATEGORIES = [
  ...FASHION_CATEGORIES,
  ...ELECTRONIC_CATEGORIES
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "mens-shirts": ["baju", "kemeja", "kaos", "pria"],
  "mens-shoes": ["sepatu", "sneakers", "pria"],
  "mens-watches": ["jam", "jam tangan", "pria"],
  "womens-dresses": ["dress", "gaun", "baju", "wanita"],
  "womens-shoes": ["sepatu", "heels", "wanita"],
  "womens-watches": ["jam", "jam tangan", "wanita"],
  "womens-bags": ["tas", "handbag", "wanita"],
  "womens-jewellery": ["perhiasan", "kalung", "cincin"],
  "tops": ["baju", "kaos", "atasan"],
  "sunglasses": ["kacamata"],
  "smartphones": ["hp", "handphone", "ponsel", "iphone"],
  "laptops": ["laptop", "komputer", "notebook"],
  "tablets": ["tablet", "ipad"],
  "mobile-accessories": [
    "charger", "casing", "headphone", "earphone",
    "aksesoris hp"
  ]
};

// Kurs simulasi, bukan kurs real-time.
const KURS = 16000;

const toRupiah = (price: number) =>
  Math.round(price * KURS);

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount);

const getCategoryLabel = (category: string) =>
  ELECTRONIC_CATEGORIES.includes(category)
    ? "Elektronik"
    : "Fashion";

const getPreviousIds = (): number[] => {
  if (Platform.OS !== "web") return [];

  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed)
      ? parsed.filter(
          (id): id is number => typeof id === "number"
        )
      : [];
  } catch {
    return [];
  }
};

const savePreviousIds = (ids: number[]) => {
  if (Platform.OS !== "web") return;

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(ids)
    );
  } catch {
    // Penyimpanan tidak tersedia.
  }
};

const shuffleProducts = (products: ApiProduct[]) => {
  const result = [...products];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

const getRandomProducts = (products: ApiProduct[]) => {
  const previousIds = getPreviousIds();

  const fresh = shuffleProducts(
    products.filter(
      product => !previousIds.includes(product.id)
    )
  );

  const selected = fresh.slice(0, LIMIT);

  if (selected.length < LIMIT) {
    const selectedIds = new Set(
      selected.map(product => product.id)
    );

    const remaining = shuffleProducts(
      products.filter(
        product => !selectedIds.has(product.id)
      )
    );

    selected.push(
      ...remaining.slice(0, LIMIT - selected.length)
    );
  }

  return selected;
};

const matchesSearch = (
  product: ApiProduct,
  search: string
) => {
  const keyword = search.trim().toLowerCase();

  if (!keyword) return true;

  const keywords =
    CATEGORY_KEYWORDS[product.category] ?? [];

  return [
    product.title,
    product.category.replace(/-/g, " "),
    getCategoryLabel(product.category),
    ...keywords
  ]
    .join(" ")
    .toLowerCase()
    .includes(keyword);
};

export default function ApiProductsSection() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [status, setStatus] = useState<Status>("loading");
  const [allItems, setAllItems] = useState<ApiProduct[]>([]);
  const [randomItems, setRandomItems] = useState<ApiProduct[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errorKind, setErrorKind] = useState("");

  // Data bidding untuk produk API.
  const [bids, setBids] = useState<Record<number, BidInfo>>({});
  const [selectedProduct, setSelectedProduct] =
    useState<ApiProduct | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [showBid, setShowBid] = useState(false);

  const controller = useRef<AbortController | null>(null);

  const visibleItems = search.trim()
    ? allItems.filter(item => matchesSearch(item, search))
    : randomItems;

  const getCurrentPrice = (product: ApiProduct) =>
    bids[product.id]?.amount ?? toRupiah(product.price);

  const getBidderCount = (product: ApiProduct) =>
    bids[product.id]?.bidders ?? 0;

  // Navigasi detail API, bukan detail Live Auction lama.
  

const openProductDetail = (product: ApiProduct) => {
  router.push({
    pathname: "/product/[id]",
    params: {
      id: String(product.id),
      source: "api",
      title: product.title,
      price: String(product.price),
      thumbnail: product.thumbnail,
      category: product.category,
    },
  });
};



  const openBidModal = (product: ApiProduct) => {
    setSelectedProduct(product);
    setBidAmount("");
    setShowBid(true);
  };

  const submitBid = () => {
    if (!selectedProduct) return;

    // Input rupiah, misalnya 500000 atau 500.000.
    const cleaned = bidAmount.replace(/[^\d]/g, "");
    const amount = Number(cleaned);
    const currentPrice = getCurrentPrice(selectedProduct);

    if (!cleaned || !Number.isSafeInteger(amount) || amount <= currentPrice) {
      Alert.alert(
        "Penawaran Tidak Valid",
        `Masukkan nominal lebih tinggi dari ${formatRupiah(currentPrice)}.`
      );
      return;
    }

    const productId = selectedProduct.id;

    setBids(previous => {
      const oldBid = previous[productId];

      return {
        ...previous,
        [productId]: {
          amount,
          bidders: (oldBid?.bidders ?? 0) + 1
        }
      };
    });

    setShowBid(false);
    setSelectedProduct(null);
    setBidAmount("");

    Alert.alert(
      "Bid Berhasil",
      `Penawaran ${formatRupiah(amount)} berhasil dicatat sementara.`
    );
  };

  const loadProducts = useCallback(() => {
    controller.current?.abort();

    const next = new AbortController();
    controller.current = next;

    setStatus("loading");
    setAllItems([]);
    setRandomItems([]);
    setMessage("");
    setErrorKind("");

    fetchApiProducts(next.signal, `${API_URL}?limit=0`)
      .then(products => {
        if (next.signal.aborted) return;

        const allowed = products.filter(product =>
          ALLOWED_CATEGORIES.includes(product.category)
        );

        const random = getRandomProducts(allowed);

        setAllItems(allowed);
        setRandomItems(random);

        savePreviousIds(random.map(product => product.id));
        setStatus("success");
      })
      .catch((error: unknown) => {
        if (next.signal.aborted) return;

        setAllItems([]);
        setRandomItems([]);

        setErrorKind(
          error instanceof ProductApiError
            ? error.kind
            : "unknown"
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan yang tidak diketahui."
        );

        setStatus("error");
      });
  }, []);

  useEffect(() => {
    loadProducts();

    return () => controller.current?.abort();
  }, [loadProducts]);

  const currentModalPrice = selectedProduct
    ? getCurrentPrice(selectedProduct)
    : 0;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>
        🌐 Produk Fashion & Elektronik
      </Text>

      <Text style={styles.caption}>
        Cari produk, lihat detail, atau ikut penawaran.
        Produk dari DummyJSON ditampilkan secara acak.
      </Text>

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Cari iPhone, laptop, sepatu, tas..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch("")}
            accessibilityRole="button"
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* LOADING */}
      {status === "loading" && (
        <View style={styles.feedback}>
          <ActivityIndicator size="large" color="#ff6b00" />
          <Text style={styles.feedbackText}>
            Memuat katalog Fashion & Elektronik...
          </Text>
        </View>
      )}

      {/* ERROR / OFFLINE */}
      {status === "error" && (
        <View style={styles.feedback}>
          <Text style={styles.errorTitle}>
            {errorKind === "network"
              ? "📡 Koneksi bermasalah / Offline"
              : "⚠️ Gagal Memuat Produk"}
          </Text>

          <Text style={styles.feedbackText}>
            {message}
          </Text>

          <TouchableOpacity
            style={styles.retry}
            onPress={loadProducts}
          >
            <Text style={styles.retryText}>↻ Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* HASIL PRODUK */}
      {status === "success" && (
        <View>
          {search.trim() !== "" && (
            <Text style={styles.resultCount}>
              {visibleItems.length} produk ditemukan
            </Text>
          )}

          {visibleItems.length === 0 && (
            <View style={styles.feedback}>
              <Text style={styles.feedbackText}>
                {allItems.length === 0
                  ? "Belum ada produk Fashion atau Elektronik."
                  : `Produk "${search}" tidak ditemukan.`}
              </Text>

              {search.trim() !== "" && (
                <TouchableOpacity
                  style={styles.retry}
                  onPress={() => setSearch("")}
                >
                  <Text style={styles.retryText}>
                    Hapus Pencarian
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* GRID KARTU PRODUK */}
          <View style={styles.productGrid}>
            {visibleItems.map(item => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    width: isDesktop ? "32%" : "100%"
                  }
                ]}
              >
                <TouchableOpacity
                  onPress={() => openProductDetail(item)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: item.thumbnail }}
                      style={styles.image}
                      resizeMode="contain"
                    />
                  </View>

                  <Text
                    style={styles.productName}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.verified}>
                  ⭐ Seller Verified
                </Text>

                <Text style={styles.price}>
                  {formatRupiah(getCurrentPrice(item))}
                </Text>

                <Text style={styles.bidder}>
                  👥 {getBidderCount(item)} Bidder
                </Text>

                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => openProductDetail(item)}
                >
                  <Text style={styles.buttonText}>
                    LIHAT DETAIL
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bidButton}
                  onPress={() => openBidModal(item)}
                >
                  <Text style={styles.buttonText}>
                    BID SEKARANG
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* REFRESH */}
          <TouchableOpacity
            style={styles.refresh}
            onPress={loadProducts}
          >
            <Text style={styles.refreshText}>
              ↻ Muat Ulang Data API
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL BID */}
      <Modal
        visible={showBid}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBid(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                🔥 Ajukan Penawaran
              </Text>

              <Text style={styles.modalProduct}>
                {selectedProduct?.title}
              </Text>

              <Text style={styles.modalLabel}>
                Harga / bid tertinggi saat ini:
              </Text>

              <Text style={styles.modalPrice}>
                {formatRupiah(currentModalPrice)}
              </Text>

              <Text style={styles.modalLabel}>
                Masukkan penawaran baru (Rp)
              </Text>

              <TextInput
                style={styles.bidInput}
                placeholder="Contoh: 500000"
                keyboardType="numeric"
                value={bidAmount}
                onChangeText={setBidAmount}
              />

              <TouchableOpacity
                style={styles.bidButton}
                onPress={submitBid}
              >
                <Text style={styles.buttonText}>
                  KONFIRMASI BID
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowBid(false);
                  setSelectedProduct(null);
                  setBidAmount("");
                }}
              >
                <Text style={styles.cancelText}>
                  BATAL
                </Text>
              </TouchableOpacity>

              <Text style={styles.modalNote}>
                Penawaran ini hanya simulasi lokal,
                belum tersimpan di server.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    marginBottom: 36
  },
  title: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#222"
  },
  caption: {
    color: "#666",
    marginTop: 6,
    marginBottom: 12
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginTop: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#eee"
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#222"
  },
  clearText: {
    fontSize: 18,
    color: "#999",
    padding: 8
  },
  resultCount: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8
  },
  feedback: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10
  },
  feedbackText: {
    color: "#666",
    marginTop: 8,
    textAlign: "center"
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#b42318",
    textAlign: "center"
  },
  retry: {
    backgroundColor: "#ff6b00",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 24,
    marginTop: 16
  },
  retryText: {
    color: "white",
    fontWeight: "bold"
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14
  },
  imageContainer: {
    width: "100%",
    height: 190,
    backgroundColor: "#f7f8fc",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 12
  },
  image: {
    width: "100%",
    height: "100%"
  },
  productName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
    minHeight: 44
  },
  verified: {
    fontSize: 14,
    color: "#444",
    marginTop: 3
  },
  price: {
    color: "#ff6b00",
    fontWeight: "bold",
    fontSize: 18,
    marginTop: 9
  },
  bidder: {
    fontSize: 14,
    color: "#444",
    marginTop: 10,
    marginBottom: 14
  },
  detailButton: {
    backgroundColor: "#333",
    padding: 13,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 10
  },
  bidButton: {
    backgroundColor: "#ff6b00",
    padding: 13,
    borderRadius: 25,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13
  },
  refresh: {
    padding: 16,
    alignItems: "center"
  },
  refreshText: {
    color: "#ff6b00",
    fontWeight: "bold"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 24,
    width: "100%",
    maxWidth: 430,
    maxHeight: "90%"
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 12
  },
  modalProduct: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 15
  },
  modalLabel: {
    color: "#666",
    marginTop: 12,
    marginBottom: 8
  },
  modalPrice: {
    color: "#ff6b00",
    fontSize: 22,
    fontWeight: "bold"
  },
  bidInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20
  },
  cancelButton: {
    alignItems: "center",
    padding: 14,
    marginTop: 10
  },
  cancelText: {
    color: "#666",
    fontWeight: "bold"
  },
  modalNote: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 12
  }
});