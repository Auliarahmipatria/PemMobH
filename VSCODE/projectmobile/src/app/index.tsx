import { useState } from "react";
import type { Product } from "../models/Product";

import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Page = "login" | "register" | "dashboard";
type Role = "admin" | "user";

export default function Index() {
  const [page, setPage] = useState<Page>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [showBid, setShowBid] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      name: "Vintage Denim Jacket",
      category: "Fashion",
      seller: "Seller Verified",
      condition: "Good",
      price: "Rp275.000",
      bidder: 0,
      image:
        "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3",
    },
    {
      id: 2,
      name: "iPhone Second",
      category: "Electronics",
      seller: "Seller Verified",
      condition: "Used",
      price: "Rp2.500.000",
      bidder: 0,
      image:
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9",
    },
    {
      id: 3,
      name: "Sneakers Limited",
      category: "Footwear",
      seller: "Seller Verified",
      condition: "Like New",
      price: "Rp450.000",
      bidder: 0,
      image:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    },
  ]);

  // LOGIN: membedakan Admin dan User
  const handleLogin = () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      Alert.alert(
        "Login Gagal",
        "Email dan password wajib diisi."
      );
      return;
    }

    if (cleanEmail === "admin@gmail.com") {
      setRole("admin");
      setUsername("Admin");
    } else {
      setRole("user");
      setUsername(cleanEmail);
    }

    setPage("dashboard");
  };

  // LOGOUT
  const handleLogout = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setRole("user");
    setPage("login");
  };

  // FITUR BID: dipertahankan
  const addBidder = () => {
    if (!selectedProduct) return;

    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === selectedProduct.id
          ? {
              ...product,
              bidder: product.bidder + 1,
            }
          : product
      )
    );
  };

  // LOGIN PAGE
  if (page === "login") {
    return (
      <View style={styles.center}>
        <Text style={styles.logo}>🔥 Bidly</Text>
        <Text style={styles.title}>Login Account</Text>

        <TextInput
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>LOGIN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPage("register")}
        >
          <Text style={styles.link}>
            Belum punya akun? Daftar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // REGISTER PAGE
  if (page === "register") {
    return (
      <View style={styles.center}>
        <Text style={styles.logo}>🔥 Bidly</Text>
        <Text style={styles.title}>Buat Akun Baru</Text>

        <TextInput
          placeholder="Nama Lengkap"
          style={styles.input}
          onChangeText={setUsername}
        />

        <TextInput
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (
              !username.trim() ||
              !email.trim() ||
              !password.trim()
            ) {
              Alert.alert(
                "Pendaftaran Gagal",
                "Semua kolom wajib diisi."
              );
              return;
            }

            Alert.alert(
              "Berhasil",
              "Silakan login menggunakan akun kamu."
            );
            setPage("login");
          }}
        >
          <Text style={styles.buttonText}>DAFTAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPage("login")}
        >
          <Text style={styles.link}>
            Sudah punya akun? Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // DASHBOARD
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🔥 Bidly</Text>

        <View>
          <Text>
            👤 {role === "admin" ? "Admin" : "User"}
          </Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Selamat Datang di Bidly
        </Text>

        <Text style={styles.desc}>
          Marketplace preloved dengan sistem
          lelang real-time.
        </Text>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>
            Mulai Lelang
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>
        🔥 Live Auction
      </Text>

      {products.map((item, index) => (
        <View style={styles.card} key={item.id}>
          <Image
            source={{ uri: item.image }}
            style={styles.image}
          />

          <Text style={styles.product}>
            {item.name}
          </Text>

          <Text>⭐ Seller Verified</Text>

          <Text style={styles.price}>
            {item.price}
          </Text>

          <Text>👥 {item.bidder} Bidder</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setSelectedProduct(item);
              setShowBid(true);
            }}
          >
            <Text style={styles.buttonText}>
              BID SEKARANG
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal
        visible={showBid}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBid(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.title}>Ajukan Bid</Text>

            <Text style={{ marginBottom: 15 }}>
              {selectedProduct?.name}
            </Text>

            <TextInput
  style={styles.input}
  placeholder="Masukkan nominal bid"
  keyboardType="numeric"
  value={bidAmount}
  onChangeText={setBidAmount}
/>

<TouchableOpacity
  style={styles.button}
  onPress={() => {
    if (!bidAmount.trim()) {
      Alert.alert("Bid gagal", "Masukkan nominal bid terlebih dahulu");
      return;
    }

    addBidder();
    Alert.alert("Berhasil", "Bid berhasil diajukan");
    setBidAmount("");
    setShowBid(false);
  }}
>
  <Text style={styles.buttonText}>AJUKAN BID</Text>
</TouchableOpacity>
                       <TouchableOpacity
              onPress={() => setShowBid(false)}
            >
              <Text style={styles.link}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 25,
  },
  logoutButton: {
    backgroundColor: "#ff3b30",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 10,
    alignItems: "center",
  },
  logoutText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  center: {
    flex: 1,
    backgroundColor: "#f7f8fc",
    justifyContent: "center",
    padding: 25,
  },
  logo: {
    fontSize: 35,
    fontWeight: "bold",
    color: "#ff6b00",
    textAlign: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
  },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#ff6b00",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  link: {
    textAlign: "center",
    color: "#ff6b00",
    marginTop: 20,
  },
  container: {
    flex: 1,
    backgroundColor: "#f7f8fc",
    padding: 20,
  },
  header: {
    marginTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hero: {
    backgroundColor: "#fff0e5",
    padding: 25,
    borderRadius: 25,
    marginTop: 25,
  },
  heroTitle: {
    fontSize: 25,
    fontWeight: "bold",
  },
  desc: {
    marginTop: 15,
    color: "#666",
  },
  section: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 30,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 25,
    padding: 15,
    marginTop: 20,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 20,
  },
  product: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
  },
  price: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#ff6b00",
    marginVertical: 10,
  },
});
