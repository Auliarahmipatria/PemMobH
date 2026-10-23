
import { router, useLocalSearchParams } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import productsData from "../../data/products.json";
import type { Product } from "../../models/Product";

const products = productsData as Product[];

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = products.find((item) => item.id === Number(id));

  const goToAuction = () => {
    router.replace({
      pathname: "/",
      params: { page: "dashboard" },
    });
  };

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Produk tidak ditemukan</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={goToAuction}
        >
          <Text style={styles.buttonText}>KEMBALI KE BERANDA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: product.image }} style={styles.image} />
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.price}>{product.price}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.info}>Kategori: {product.category}</Text>
        <Text style={styles.info}>Penjual: {product.seller}</Text>
        <Text style={styles.info}>Kondisi: {product.condition}</Text>
        <Text style={styles.info}>Jumlah bidder awal: {product.bidder}</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={goToAuction}
      >
        <Text style={styles.buttonText}>KEMBALI KE BERANDA</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f7f8fc",
    padding: 20,
  },
  image: {
    width: "100%",
    height: 260,
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
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
  },
  button: {
    backgroundColor: "#ff6b00",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
