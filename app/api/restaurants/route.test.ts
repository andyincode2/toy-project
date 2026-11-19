import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { GET } from "./route";

const SERVER_KEY = "test-server-key-abc123";

function googlePlace(
  id: string,
  rating: number,
  userRatingCount: number,
  types: string[] = ["restaurant", "food"]
) {
  return {
    id,
    displayName: { text: `식당 ${id}`, languageCode: "ko" },
    rating,
    userRatingCount,
    googleMapsUri: `https://maps.google.com/?cid=${id}`,
    location: { latitude: 37.56, longitude: 126.98 },
    types,
  };
}

function stubGoogle(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function request(query: string) {
  return new Request(`http://localhost:3000/api/restaurants?${query}`);
}

beforeEach(() => {
  vi.stubEnv("GOOGLE_MAPS_SERVER_API_KEY", SERVER_KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("기준 위치와 반경으로 찾은 식당을 리뷰 수와 상관없이 평점순으로 돌려준다", async () => {
  const fetchMock = stubGoogle({
    places: [
      googlePlace("few", 5.0, 3),
      googlePlace("mid", 4.4, 800),
      googlePlace("top", 4.8, 120),
      googlePlace("hotel", 4.9, 5000, ["hotel", "lodging", "restaurant"]),
    ],
  });

  const response = await GET(request("lat=37.5665&lng=126.978&radius=2000"));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.restaurants.map((r: { id: string }) => r.id)).toEqual([
    "few",
    "top",
    "mid",
  ]);
  expect(body.restaurants[1]).toEqual({
    id: "top",
    name: "식당 top",
    rating: 4.8,
    reviewCount: 120,
    location: { lat: 37.56, lng: 126.98 },
    mapsUrl: "https://maps.google.com/?cid=top",
  });
  const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(sent.locationRestriction.circle).toEqual({
    center: { latitude: 37.5665, longitude: 126.978 },
    radius: 2000,
  });
});

test("lang으로 영어를 주면 영어 식당 이름을 받도록 구글에 요청하고 기본은 한국어다", async () => {
  const fetchMock = stubGoogle({ places: [] });

  await GET(request("lat=37.5&lng=127&radius=500&lang=en"));
  await GET(request("lat=37.5&lng=127&radius=500"));

  expect(JSON.parse(fetchMock.mock.calls[0][1].body).languageCode).toBe("en");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).languageCode).toBe("ko");
});

test("지원하지 않는 언어는 구글을 호출하지 않고 400으로 거절한다", async () => {
  const fetchMock = stubGoogle({ places: [] });

  const response = await GET(request("lat=37.5&lng=127&radius=500&lang=fr"));

  expect(response.status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("구글이 식당을 하나도 찾지 못하면 빈 목록으로 응답한다", async () => {
  stubGoogle({});

  const response = await GET(request("lat=37.5&lng=127&radius=500"));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ restaurants: [] });
});

test.each([
  ["좌표가 없음", "radius=1000"],
  ["위도가 숫자가 아님", "lat=abc&lng=127&radius=1000"],
  ["위도 범위를 벗어남", "lat=91&lng=127&radius=1000"],
  ["경도 범위를 벗어남", "lat=37&lng=181&radius=1000"],
  ["반경이 없음", "lat=37&lng=127"],
  ["반경이 0 이하", "lat=37&lng=127&radius=0"],
  ["반경이 구글 한도(50000m)를 넘음", "lat=37&lng=127&radius=50001"],
])("잘못된 요청(%s)은 구글을 호출하지 않고 400으로 거절한다", async (_name, query) => {
  const fetchMock = stubGoogle({ places: [] });

  const response = await GET(request(query));

  expect(response.status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("구글 호출이 실패하면 502로 응답하고 응답 본문에 서버 키가 들어가지 않는다", async () => {
  stubGoogle({ error: { status: "PERMISSION_DENIED" } }, 403);

  const response = await GET(request("lat=37.5&lng=127&radius=1000"));
  const text = await response.text();

  expect(response.status).toBe(502);
  expect(text).not.toContain(SERVER_KEY);
});

test("서버 키가 설정되어 있지 않으면 구글을 호출하지 않고 500으로 응답한다", async () => {
  vi.stubEnv("GOOGLE_MAPS_SERVER_API_KEY", "");
  const fetchMock = stubGoogle({ places: [] });

  const response = await GET(request("lat=37.5&lng=127&radius=1000"));

  expect(response.status).toBe(500);
  expect(fetchMock).not.toHaveBeenCalled();
});
