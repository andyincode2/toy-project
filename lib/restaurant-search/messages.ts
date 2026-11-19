import type { Language } from "./types";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "ko", label: "한국어" },
  { code: "en", label: "English" },
];

type Notice = { title: string; description?: string };

export type Messages = {
  languageLabel: string;
  locate: string;
  placeLabel: string;
  placePlaceholder: string;
  search: string;
  radiusLabel: string;
  minReviewsLabel: string;
  minReviewsAuto: string;
  minReviewsAutoWith: (count: string) => string;
  minReviewsFixed: (count: string) => string;
  idle: string;
  loading: string;
  errorTitle: string;
  retry: string;
  emptyTitle: string;
  emptyNone: string;
  emptyBelowMin: (count: string) => string;
  reviews: (count: string) => string;
  googleMaps: string;
  origin: string;
  locationDenied: Notice;
  locationFailed: Notice;
  placeNotFound: Notice;
  placeLookupFailed: Notice;
  mapError: Notice;
  mapKeyMissing: Notice;
};

export const messages: Record<Language, Messages> = {
  ko: {
    languageLabel: "표시 언어",
    locate: "내 위치",
    placeLabel: "장소 이름이나 주소",
    placePlaceholder: "장소 또는 주소",
    search: "검색",
    radiusLabel: "반경",
    minReviewsLabel: "최소 리뷰 수",
    minReviewsAuto: "평균 (자동)",
    minReviewsAutoWith: (count) => `평균 ${count}개 이상 (자동)`,
    minReviewsFixed: (count) => `리뷰 ${count}개 이상`,
    idle: "기준 위치를 정해 주세요",
    loading: "검색 중…",
    errorTitle: "식당을 불러오지 못했습니다",
    retry: "다시 시도",
    emptyTitle: "조건에 맞는 식당이 없습니다",
    emptyNone: "반경 안에서 식당을 찾지 못했습니다",
    emptyBelowMin: (count) =>
      `리뷰 ${count}개 이상인 식당이 없습니다. 기준을 낮추거나 반경을 넓혀 보세요.`,
    reviews: (count) => `리뷰 ${count}개`,
    googleMaps: "구글 지도",
    origin: "기준 위치",
    locationDenied: {
      title: "위치 권한이 거부되었습니다",
      description: "장소를 입력하거나 지도를 눌러 주세요",
    },
    locationFailed: {
      title: "현재 위치를 가져오지 못했습니다",
      description: "장소를 입력하거나 지도를 눌러 주세요",
    },
    placeNotFound: { title: "장소를 찾지 못했습니다" },
    placeLookupFailed: { title: "장소를 검색하지 못했습니다" },
    mapError: {
      title: "지도를 불러오지 못했습니다",
      description: "목록은 계속 사용할 수 있습니다",
    },
    mapKeyMissing: {
      title: "지도를 표시할 수 없습니다",
      description:
        "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY가 설정되지 않았습니다",
    },
  },
  en: {
    languageLabel: "Language",
    locate: "My location",
    placeLabel: "Place name or address",
    placePlaceholder: "Place or address",
    search: "Search",
    radiusLabel: "Radius",
    minReviewsLabel: "Min reviews",
    minReviewsAuto: "Average (auto)",
    minReviewsAutoWith: (count) => `Average ${count}+ (auto)`,
    minReviewsFixed: (count) => `${count}+ reviews`,
    idle: "Choose a starting point",
    loading: "Searching…",
    errorTitle: "Couldn't load restaurants",
    retry: "Try again",
    emptyTitle: "No matching restaurants",
    emptyNone: "No restaurants found in this radius",
    emptyBelowMin: (count) =>
      `No restaurants with ${count}+ reviews. Lower the minimum or widen the radius.`,
    reviews: (count) => `${count} reviews`,
    googleMaps: "Google Maps",
    origin: "Origin",
    locationDenied: {
      title: "Location permission denied",
      description: "Enter a place or tap the map",
    },
    locationFailed: {
      title: "Couldn't get your location",
      description: "Enter a place or tap the map",
    },
    placeNotFound: { title: "Place not found" },
    placeLookupFailed: { title: "Couldn't search for the place" },
    mapError: {
      title: "Couldn't load the map",
      description: "The list still works",
    },
    mapKeyMissing: {
      title: "Can't show the map",
      description: "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY is not set",
    },
  },
};
