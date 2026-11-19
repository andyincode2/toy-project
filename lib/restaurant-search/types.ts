export type LatLng = { lat: number; lng: number };

export type Restaurant = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  location: LatLng;
  mapsUrl: string;
};

export type Place = { name: string; location: LatLng };

export type Language = "ko" | "en";
