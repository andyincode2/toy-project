import type { Language, LatLng, Place, Restaurant } from "./types";

const PLACES_API = "https://places.googleapis.com/v1";

const NEARBY_FIELDS = [
  "places.id",
  "places.displayName",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.location",
  "places.types",
].join(",");

const TEXT_SEARCH_FIELDS = "places.displayName,places.location";

/** 구글 Places API 호출이 실패했을 때 발생한다. 메시지에는 키나 응답 본문을 넣지 않는다. */
export class PlacesApiError extends Error {}

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
};

async function callPlaces(
  endpoint: string,
  fieldMask: string,
  body: unknown,
  apiKey: string,
  fetchFn: typeof fetch
): Promise<{ places?: GooglePlace[] }> {
  const response = await fetchFn(`${PLACES_API}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new PlacesApiError(`Places API ${endpoint} 실패 (${response.status})`);
  }
  return response.json();
}

function toRestaurant(place: GooglePlace): Restaurant | null {
  const { id, displayName, rating, userRatingCount, googleMapsUri, location } =
    place;
  // 호텔처럼 숙박 시설이 식당 유형을 함께 가진 곳은 식당으로 보지 않는다.
  if (place.types?.includes("lodging")) return null;
  if (
    !id ||
    !displayName?.text ||
    rating === undefined ||
    userRatingCount === undefined ||
    !googleMapsUri ||
    !location
  ) {
    return null;
  }
  return {
    id,
    name: displayName.text,
    rating,
    reviewCount: userRatingCount,
    location: { lat: location.latitude, lng: location.longitude },
    mapsUrl: googleMapsUri,
  };
}

/**
 * 반경 안의 인기 상위 최대 20곳을 받아 온다. 구글은 평점순 정렬을 지원하지 않아
 * 정렬과 리뷰 수 조건은 호출한 쪽(rankRestaurants)이 맡는다.
 */
export async function searchNearbyRestaurants(
  search: { center: LatLng; radius: number; language?: Language },
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<Restaurant[]> {
  const data = await callPlaces(
    "places:searchNearby",
    NEARBY_FIELDS,
    {
      includedTypes: ["restaurant"],
      languageCode: search.language ?? "ko",
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: {
            latitude: search.center.lat,
            longitude: search.center.lng,
          },
          radius: search.radius,
        },
      },
    },
    apiKey,
    fetchFn
  );
  return (data.places ?? []).flatMap((place) => toRestaurant(place) ?? []);
}

/** 장소 이름이나 주소를 텍스트 검색의 첫 결과로 바꾼다. 찾지 못하면 null. */
export async function findPlace(
  query: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<Place | null> {
  const data = await callPlaces(
    "places:searchText",
    TEXT_SEARCH_FIELDS,
    { textQuery: query, languageCode: "ko", pageSize: 1 },
    apiKey,
    fetchFn
  );
  const place = data.places?.[0];
  if (!place?.location || !place.displayName?.text) return null;
  return {
    name: place.displayName.text,
    location: {
      lat: place.location.latitude,
      lng: place.location.longitude,
    },
  };
}
