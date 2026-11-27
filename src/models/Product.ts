export interface PickupLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string;
}

export type PickupCoordinates = Pick<PickupLocation, "latitude" | "longitude">;

export interface Product {
  id: number;
  name: string;
  price: string;
  bidder: number;
  image: string;
  category: string;
  seller: string;
  condition: string;
  pickupLocation?: PickupLocation;
}
