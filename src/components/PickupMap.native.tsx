import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

import type { PickupCoordinates } from "../models/Product";

type PickupMapProps = {
  coordinate: PickupCoordinates;
  onCoordinateChange?: (coordinate: PickupCoordinates) => void;
  height?: number;
};

export default function PickupMap({
  coordinate,
  onCoordinateChange,
  height = 220,
}: PickupMapProps) {
  const [region, setRegion] = useState<Region>({
    ...coordinate,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  });

  useEffect(() => {
    setRegion((current) => ({
      ...current,
      ...coordinate,
    }));
  }, [coordinate.latitude, coordinate.longitude]);

  const selectCoordinate = (next: PickupCoordinates) => {
    setRegion((current) => ({ ...current, ...next }));
    onCoordinateChange?.(next);
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={(event) => {
          if (onCoordinateChange) {
            selectCoordinate(event.nativeEvent.coordinate);
          }
        }}
        showsCompass
        toolbarEnabled={false}
      >
        <Marker
          coordinate={coordinate}
          title="Titik pengambilan barang"
          description="Tekan peta atau geser pin untuk mengatur titik COD"
          draggable={Boolean(onCoordinateChange)}
          onDragEnd={(event) => selectCoordinate(event.nativeEvent.coordinate)}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: "hidden",
    width: "100%",
  },
  map: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
