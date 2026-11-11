import { router, useLocalSearchParams } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import productsData from "../../data/products.json";
import type { Product } from "../../models/Product";

const products = productsData as Product[];

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const product = products.find(
    item => String(item.id) === String(id)
  );

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>
          Produk tidak ditemukan
        </Text>

        <Text style={styles.description}>
          ID produk: {id ?? "Tidak tersedia"}
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.buttonText}>
            KEMBALI KE BERANDA
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={styles.back}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>
          ← Kembali ke Live Auction
        </Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.details}>
          <Text style={styles.category}>
            {product.category}
          </Text>

          <Text style={styles.title}>
            {product.name}
          </Text>

          <Text style={styles.price}>
            {product.price}
          </Text>

          <Text style={styles.verified}>
            ⭐ Seller Verified
          </Text>

          <View style={styles.divider} />

          <Text style={styles.heading}>
            Informasi Produk
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.info}>
              Nama Produk: {product.name}
            </Text>

            <Text style={styles.info}>
              Kategori: {product.category}
            </Text>

            <Text style={styles.info}>
              Penjual: {product.seller}
            </Text>

            <Text style={styles.info}>
              Kondisi: {product.condition}
            </Text>

            <Text style={styles.info}>
              Jumlah Bidder Awal: {product.bidder}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>
              KEMBALI KE BERANDA
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f8fc"
  },

  container: {
    padding: 20,
    paddingBottom: 40
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f8fc",
    padding: 24
  },

  back: {
    marginBottom: 18
  },

  backText: {
    color: "#ff6b00",
    fontSize: 16,
    fontWeight: "bold"
  },

  card: {
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden"
  },

  imageContainer: {
    width: "100%",
    height: 320,
    backgroundColor: "#f7f8fc",
    alignItems: "center",
    justifyContent: "center"
  },

  image: {
    width: "100%",
    height: "100%"
  },

  details: {
    padding: 22
  },

  category: {
    color: "#777",
    fontSize: 14,
    marginBottom: 8
  },

  title: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 10
  },

  price: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#ff6b00",
    marginTop: 8,
    marginBottom: 10
  },

  verified: {
    fontSize: 15,
    color: "#444",
    marginBottom: 12
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 18
  },

  heading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 12,
    marginTop: 12
  },

  infoBox: {
    backgroundColor: "#f7f8fc",
    padding: 18,
    borderRadius: 15,
    gap: 14
  },

  info: {
    fontSize: 15,
    color: "#333"
  },

  description: {
    fontSize: 15,
    lineHeight: 24,
    color: "#555",
    marginBottom: 18
  },

  button: {
    backgroundColor: "#ff6b00",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 24
  },

  buttonText: {
    color: "white",
    fontWeight: "bold"
  }
});
