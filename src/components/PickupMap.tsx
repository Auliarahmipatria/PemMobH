import { StyleSheet, Text, View } from "react-native";
import type { PickupCoordinates } from "../models/Product";

type PickupMapProps = {
  coordinate: PickupCoordinates;
  onCoordinateChange?: (coordinate: PickupCoordinates) => void;
  height?: number;
};

export default function PickupMap({ coordinate, height = 220 }: PickupMapProps) {
  return (
    <View style={[styles.fallback, { height }]}>
      <Text style={styles.title}>Peta tersedia di aplikasi Android/iOS</Text>
      <Text style={styles.coordinate}>
        {coordinate.latitude.toFixed(6)}, {coordinate.longitude.toFixed(6)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    backgroundColor: "#eef4fa",
    borderRadius: 14,
    justifyContent: "center",
    padding: 14,
  },
  title: { color: "#344054", fontSize: 13, fontWeight: "600", textAlign: "center" },
  coordinate: { color: "#667085", fontSize: 12, marginTop: 6, textAlign: "center" },
});
