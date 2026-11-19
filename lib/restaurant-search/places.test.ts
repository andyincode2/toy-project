import { expect, test, vi } from "vitest";

import { findPlace, PlacesApiError, searchNearbyRestaurants } from "./places";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const nearbyPlace = (overrides: Record<string, unknown> = {}) => ({
  id: "ChIJ-1",
  displayName: { text: "명동교자", languageCode: "ko" },
  rating: 4.2,
  userRatingCount: 15096,
  googleMapsUri: "https://maps.google.com/?cid=1",
  location: { latitude: 37.5626, longitude: 126.9853 },
  types: ["korean_restaurant", "restaurant", "food"],
  ...overrides,
});

test("주변 검색은 반경 안의 식당을 한국어 인기순으로 최대 20곳 요청한다", async () => {
  const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ places: [] }));

  await searchNearbyRestaurants(
    { center: { lat: 37.5665, lng: 126.978 }, radius: 1000 },
    "test-server-key",
    fetchFn
  );

  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("https://places.googleapis.com/v1/places:searchNearby");
  expect(init.method).toBe("POST");
  expect(init.headers["X-Goog-Api-Key"]).toBe("test-server-key");
  expect(init.headers["X-Goog-FieldMask"].split(",")).toEqual(
    expect.arrayContaining([
      "places.id",
      "places.displayName",
      "places.rating",
      "places.userRatingCount",
      "places.googleMapsUri",
      "places.location",
      "places.types",
    ])
  );
  expect(JSON.parse(init.body)).toEqual({
    includedTypes: ["restaurant"],
    languageCode: "ko",
    maxResultCount: 20,
    rankPreference: "POPULARITY",
    locationRestriction: {
      circle: {
        center: { latitude: 37.5665, longitude: 126.978 },
        radius: 1000,
      },
    },
  });
});

test("표시 언어를 영어로 주면 식당 이름도 영어로 받도록 요청한다", async () => {
  const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ places: [] }));

  await searchNearbyRestaurants(
    { center: { lat: 37.5665, lng: 126.978 }, radius: 1000, language: "en" },
    "k",
    fetchFn
  );

  expect(JSON.parse(fetchFn.mock.calls[0][1].body).languageCode).toBe("en");
});

test("주변 검색 응답을 식당 이름, 평점, 리뷰 수, 위치, 구글 지도 링크로 바꾼다", async () => {
  const fetchFn = vi
    .fn()
    .mockResolvedValue(jsonResponse({ places: [nearbyPlace()] }));

  const restaurants = await searchNearbyRestaurants(
    { center: { lat: 37.5665, lng: 126.978 }, radius: 1000 },
    "k",
    fetchFn
  );

  expect(restaurants).toEqual([
    {
      id: "ChIJ-1",
      name: "명동교자",
      rating: 4.2,
      reviewCount: 15096,
      location: { lat: 37.5626, lng: 126.9853 },
      mapsUrl: "https://maps.google.com/?cid=1",
    },
  ]);
});

test("숙박 시설이 식당 유형을 함께 가진 경우와 평점 정보가 없는 장소는 제외한다", async () => {
  const fetchFn = vi.fn().mockResolvedValue(
    jsonResponse({
      places: [
        nearbyPlace({ id: "keep" }),
        nearbyPlace({
          id: "hotel",
          types: ["hotel", "lodging", "restaurant", "food"],
        }),
        nearbyPlace({ id: "no-rating", rating: undefined }),
        nearbyPlace({ id: "no-count", userRatingCount: undefined }),
      ],
    })
  );

  const restaurants = await searchNearbyRestaurants(
    { center: { lat: 37.5665, lng: 126.978 }, radius: 1000 },
    "k",
    fetchFn
  );

  expect(restaurants.map((r) => r.id)).toEqual(["keep"]);
});

test("주변 검색 결과가 하나도 없는 응답(places 키 없음)은 빈 목록이다", async () => {
  const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}));

  await expect(
    searchNearbyRestaurants(
      { center: { lat: 0, lng: 0 }, radius: 500 },
      "k",
      fetchFn
    )
  ).resolves.toEqual([]);
});

test("구글이 오류로 응답하면 PlacesApiError가 발생하고 키는 메시지에 들어가지 않는다", async () => {
  const fetchFn = vi
    .fn()
    .mockResolvedValue(
      jsonResponse({ error: { status: "PERMISSION_DENIED" } }, 403)
    );

  const failure = searchNearbyRestaurants(
    { center: { lat: 0, lng: 0 }, radius: 500 },
    "secret-key-123",
    fetchFn
  );

  await expect(failure).rejects.toBeInstanceOf(PlacesApiError);
  await expect(failure).rejects.not.toThrow(/secret-key-123/);
});

test("장소 이름이나 주소는 텍스트 검색의 첫 결과로 이름과 좌표를 찾는다", async () => {
  const fetchFn = vi.fn().mockResolvedValue(
    jsonResponse({
      places: [
        {
          displayName: { text: "서울역", languageCode: "ko" },
          location: { latitude: 37.5547, longitude: 126.9707 },
        },
      ],
    })
  );

  const place = await findPlace("서울역", "test-server-key", fetchFn);

  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
  expect(init.headers["X-Goog-Api-Key"]).toBe("test-server-key");
  expect(init.headers["X-Goog-FieldMask"]).toBe(
    "places.displayName,places.location"
  );
  expect(JSON.parse(init.body)).toEqual({
    textQuery: "서울역",
    languageCode: "ko",
    pageSize: 1,
  });
  expect(place).toEqual({
    name: "서울역",
    location: { lat: 37.5547, lng: 126.9707 },
  });
});

test("텍스트 검색에서 찾지 못하면 null을 돌려준다", async () => {
  const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}));

  await expect(findPlace("zzzzqqq", "k", fetchFn)).resolves.toBeNull();
});

test("텍스트 검색이 오류로 응답하면 PlacesApiError가 발생한다", async () => {
  const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, 500));

  await expect(findPlace("서울역", "k", fetchFn)).rejects.toBeInstanceOf(
    PlacesApiError
  );
});
