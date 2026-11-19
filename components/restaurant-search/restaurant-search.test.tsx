import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { LatLng, Restaurant } from "@/lib/restaurant-search/types";

import { RestaurantSearch } from "./restaurant-search";

// 구글 지도는 외부 경계라 대체한다. 지도에서 찍기와 지도에 전달된 값만 관찰한다.
vi.mock("./search-map", () => ({
  SearchMap: ({
    origin,
    radius,
    restaurants,
    onPick,
  }: {
    origin: LatLng | null;
    radius: number;
    restaurants: Restaurant[];
    onPick: (point: LatLng) => void;
  }) => (
    <div
      data-testid="map"
      data-origin={origin ? `${origin.lat},${origin.lng}` : ""}
      data-radius={radius}
      data-pins={restaurants.map((r) => r.id).join(",")}
    >
      <button onClick={() => onPick({ lat: 35.1, lng: 129.04 })}>
        지도에서 찍기
      </button>
    </div>
  ),
}));

function restaurant(
  id: string,
  rating: number,
  reviewCount: number
): Restaurant {
  return {
    id,
    name: `식당 ${id}`,
    rating,
    reviewCount,
    location: { lat: 37.5, lng: 127 },
    mapsUrl: `https://maps.google.com/?cid=${id}`,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubGeolocation(
  getCurrentPosition: (
    success: (position: { coords: { latitude: number; longitude: number } }) => void,
    error: (error: { code: number }) => void
  ) => void
) {
  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition },
    configurable: true,
  });
}

const allowLocation = () =>
  stubGeolocation((success) =>
    success({ coords: { latitude: 37.5665, longitude: 126.978 } })
  );

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function restaurantRequests() {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith("/api/restaurants"));
}

test("기준 위치를 정하기 전에는 검색하지 않고 안내만 보인다", () => {
  render(<RestaurantSearch />);

  expect(screen.getByText(/기준 위치를 정해 주세요/)).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("내 위치를 누르면 그 좌표와 기본 반경 1km로 검색해 평점순 목록을 보여 준다", async () => {
  allowLocation();
  fetchMock.mockResolvedValue(
    jsonResponse({
      restaurants: [restaurant("a", 4.8, 2000), restaurant("b", 4.4, 2000)],
    })
  );
  render(<RestaurantSearch />);

  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));

  const items = await screen.findAllByRole("listitem");
  expect(restaurantRequests()).toEqual([
    "/api/restaurants?lat=37.5665&lng=126.978&radius=1000&lang=ko",
  ]);
  expect(items).toHaveLength(2);
  expect(within(items[0]).getByText("식당 a")).toBeInTheDocument();
  expect(within(items[1]).getByText("식당 b")).toBeInTheDocument();
  expect(screen.getByTestId("map")).toHaveAttribute("data-origin", "37.5665,126.978");
  expect(screen.getByTestId("map")).toHaveAttribute("data-pins", "a,b");
});

test("목록의 각 항목은 이름, 평점, 리뷰 수와 새 탭으로 여는 구글 지도 링크를 보여 준다", async () => {
  allowLocation();
  fetchMock.mockResolvedValue(
    jsonResponse({ restaurants: [restaurant("a", 4.8, 1234)] })
  );
  render(<RestaurantSearch />);

  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));

  const item = (await screen.findAllByRole("listitem"))[0];
  expect(within(item).getByText("식당 a")).toBeInTheDocument();
  expect(within(item).getByText(/4\.8/)).toBeInTheDocument();
  expect(within(item).getByText(/1,234/)).toBeInTheDocument();
  const link = within(item).getByRole("link", { name: /구글 지도/ });
  expect(link).toHaveAttribute("href", "https://maps.google.com/?cid=a");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
});

test("반경을 바꾸면 같은 기준 위치로 새 반경으로 다시 검색하고 지도에도 새 반경을 전달한다", async () => {
  allowLocation();
  fetchMock.mockResolvedValue(jsonResponse({ restaurants: [restaurant("a", 4.8, 1200)] }));
  render(<RestaurantSearch />);
  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));
  await screen.findAllByRole("listitem");

  fireEvent.click(screen.getByRole("button", { name: "2km" }));

  await waitFor(() =>
    expect(restaurantRequests()).toEqual([
      "/api/restaurants?lat=37.5665&lng=126.978&radius=1000&lang=ko",
      "/api/restaurants?lat=37.5665&lng=126.978&radius=2000&lang=ko",
    ])
  );
  expect(screen.getByTestId("map")).toHaveAttribute("data-radius", "2000");
});

test("기준 위치 전에 반경만 바꿔도 검색하지 않는다", () => {
  render(<RestaurantSearch />);

  fireEvent.click(screen.getByRole("button", { name: "3km" }));

  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByTestId("map")).toHaveAttribute("data-radius", "3000");
});

test("장소 이름을 입력해 제출하면 찾은 좌표가 기준 위치가 되어 검색한다", async () => {
  fetchMock.mockImplementation(async (url: string) =>
    String(url).startsWith("/api/places")
      ? jsonResponse({ name: "서울역", location: { lat: 37.5547, lng: 126.9707 } })
      : jsonResponse({ restaurants: [restaurant("a", 4.8, 1200)] })
  );
  render(<RestaurantSearch />);

  fireEvent.change(screen.getByRole("textbox", { name: /장소 이름|주소/ }), {
    target: { value: "서울역" },
  });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));

  await screen.findAllByRole("listitem");
  expect(fetchMock.mock.calls[0][0]).toBe(
    `/api/places?q=${encodeURIComponent("서울역")}`
  );
  expect(restaurantRequests()).toEqual([
    "/api/restaurants?lat=37.5547&lng=126.9707&radius=1000&lang=ko",
  ]);
  expect(screen.getByTestId("map")).toHaveAttribute("data-origin", "37.5547,126.9707");
});

test("찾을 수 없는 장소를 입력하면 찾지 못했다고 안내하고 기존 기준 위치와 목록은 유지한다", async () => {
  allowLocation();
  fetchMock.mockImplementation(async (url: string) =>
    String(url).startsWith("/api/places")
      ? jsonResponse({ error: "not_found" }, 404)
      : jsonResponse({ restaurants: [restaurant("a", 4.8, 1200)] })
  );
  render(<RestaurantSearch />);
  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));
  await screen.findAllByRole("listitem");

  fireEvent.change(screen.getByRole("textbox", { name: /장소 이름|주소/ }), {
    target: { value: "zzzzqqq" },
  });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/장소를 찾지 못했습니다/);
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(screen.getByTestId("map")).toHaveAttribute("data-origin", "37.5665,126.978");
  expect(restaurantRequests()).toHaveLength(1);
});

test("지도에서 한 지점을 찍으면 그 지점이 기준 위치가 되어 검색한다", async () => {
  fetchMock.mockResolvedValue(jsonResponse({ restaurants: [restaurant("a", 4.8, 1200)] }));
  render(<RestaurantSearch />);

  fireEvent.click(screen.getByRole("button", { name: "지도에서 찍기" }));

  await screen.findAllByRole("listitem");
  expect(restaurantRequests()).toEqual([
    "/api/restaurants?lat=35.1&lng=129.04&radius=1000&lang=ko",
  ]);
});

test("조건에 맞는 식당이 없으면 빈 상태 안내를 보여 주고 지도에는 핀이 없다", async () => {
  allowLocation();
  fetchMock.mockResolvedValue(jsonResponse({ restaurants: [] }));
  render(<RestaurantSearch />);

  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));

  expect(await screen.findByText(/조건에 맞는 식당이 없습니다/)).toBeInTheDocument();
  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  expect(screen.getByTestId("map")).toHaveAttribute("data-pins", "");
});

test("위치 권한을 거부하면 거부되었다는 안내와 다른 방법으로 계속할 수 있다는 안내를 보여 준다", async () => {
  stubGeolocation((_success, error) => error({ code: 1 }));
  render(<RestaurantSearch />);

  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(/위치 권한이 거부되었습니다/);
  expect(alert).toHaveTextContent(/장소를 입력하거나 지도를 눌러 주세요/);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("검색이 실패하면 오류와 다시 시도를 보여 주고 이전 결과는 남기지 않으며 다시 시도하면 복구한다", async () => {
  allowLocation();
  fetchMock.mockResolvedValueOnce(
    jsonResponse({ restaurants: [restaurant("old", 4.9, 1500)] })
  );
  render(<RestaurantSearch />);
  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));
  await screen.findByText("식당 old");

  fetchMock.mockResolvedValueOnce(jsonResponse({ error: "upstream_failed" }, 502));
  fireEvent.click(screen.getByRole("button", { name: "2km" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/식당을 불러오지 못했습니다/);
  expect(screen.queryByText("식당 old")).not.toBeInTheDocument();
  expect(screen.getByTestId("map")).toHaveAttribute("data-pins", "");

  fetchMock.mockResolvedValueOnce(
    jsonResponse({ restaurants: [restaurant("new", 4.7, 1300)] })
  );
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

  expect(await screen.findByText("식당 new")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(restaurantRequests().at(-1)).toBe(
    "/api/restaurants?lat=37.5665&lng=126.978&radius=2000&lang=ko"
  );
});

test("검색하는 동안 로딩 상태를 보여 준다", async () => {
  allowLocation();
  let resolve!: (response: Response) => void;
  fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
  render(<RestaurantSearch />);

  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));

  expect(await screen.findByRole("status")).toHaveTextContent(/검색 중/);

  resolve(jsonResponse({ restaurants: [restaurant("a", 4.8, 1200)] }));
  await screen.findByText("식당 a");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("연속으로 검색하면 마지막 선택의 결과만 화면에 남는다", async () => {
  allowLocation();
  const pending: Array<(response: Response) => void> = [];
  fetchMock.mockImplementation(
    () => new Promise<Response>((resolve) => pending.push(resolve))
  );
  render(<RestaurantSearch />);

  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));
  await waitFor(() => expect(pending).toHaveLength(1));
  fireEvent.click(screen.getByRole("button", { name: "2km" }));
  await waitFor(() => expect(pending).toHaveLength(2));

  // 나중에 요청한 검색이 먼저 끝나고, 먼저 요청한 검색이 뒤늦게 끝난다.
  pending[1](jsonResponse({ restaurants: [restaurant("last", 4.5, 1200)] }));
  await screen.findByText("식당 last");
  pending[0](jsonResponse({ restaurants: [restaurant("first", 4.9, 1900)] }));

  await new Promise((r) => setTimeout(r, 20));
  expect(screen.getByText("식당 last")).toBeInTheDocument();
  expect(screen.queryByText("식당 first")).not.toBeInTheDocument();
});

const thresholdSelect = () =>
  screen.getByRole("combobox", { name: "최소 리뷰 수" });

test("최소 리뷰 수는 평균(자동)과 일곱 가지 고정값을 고를 수 있고 처음에는 평균(자동)이 선택되어 있다", () => {
  render(<RestaurantSearch />);

  const options = within(thresholdSelect())
    .getAllByRole("option")
    .map((option) => (option as HTMLOptionElement).value);
  expect(options).toEqual([
    "auto",
    "100",
    "500",
    "1000",
    "5000",
    "10000",
    "50000",
    "100000",
  ]);
  expect(thresholdSelect()).toHaveValue("auto");
  expect(
    within(thresholdSelect()).getByRole("option", { name: "평균 (자동)" })
  ).toBeInTheDocument();
});

test("검색하면 반경 안 식당의 평균 리뷰 수가 자동으로 선택되어 그 이상인 식당만 평점순으로 보인다", async () => {
  allowLocation();
  fetchMock.mockResolvedValue(
    jsonResponse({
      restaurants: [
        restaurant("a", 4.8, 1500),
        restaurant("b", 4.6, 700),
        restaurant("c", 4.4, 3000),
        restaurant("d", 4.2, 2000),
      ],
    })
  );
  render(<RestaurantSearch />);

  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));

  // 평균 = (1500 + 700 + 3000 + 2000) / 4 = 1800
  await screen.findByText("식당 c");
  expect(thresholdSelect()).toHaveValue("auto");
  expect(
    within(thresholdSelect()).getByRole("option", {
      name: "평균 1,800개 이상 (자동)",
    })
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole("listitem").map((item) => item.textContent)
  ).toEqual([
    expect.stringContaining("식당 c"),
    expect.stringContaining("식당 d"),
  ]);
  expect(screen.queryByText("식당 a")).not.toBeInTheDocument();
  expect(screen.getByTestId("map")).toHaveAttribute("data-pins", "c,d");
});

test("최소 리뷰 수를 바꾸면 구글을 다시 호출하지 않고 이미 받은 식당을 새 기준으로 거른다", async () => {
  allowLocation();
  fetchMock.mockResolvedValue(
    jsonResponse({
      restaurants: [
        restaurant("a", 4.8, 1500),
        restaurant("b", 4.6, 700),
        restaurant("c", 4.4, 3000),
      ],
    })
  );
  render(<RestaurantSearch />);
  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));
  await screen.findByText("식당 c");

  fireEvent.change(thresholdSelect(), { target: { value: "500" } });

  expect(
    screen.getAllByRole("listitem").map((item) => item.textContent)
  ).toEqual([
    expect.stringContaining("식당 a"),
    expect.stringContaining("식당 b"),
    expect.stringContaining("식당 c"),
  ]);
  expect(screen.getByTestId("map")).toHaveAttribute("data-pins", "a,b,c");
  expect(restaurantRequests()).toHaveLength(1);

  fireEvent.change(thresholdSelect(), { target: { value: "5000" } });

  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  expect(restaurantRequests()).toHaveLength(1);
});

test("선택한 최소 리뷰 수에 맞는 식당이 없으면 그 기준을 밝히고 낮추도록 안내한다", async () => {
  allowLocation();
  fetchMock.mockResolvedValue(
    jsonResponse({ restaurants: [restaurant("a", 4.8, 1500)] })
  );
  render(<RestaurantSearch />);
  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));
  await screen.findByText("식당 a");

  fireEvent.change(thresholdSelect(), { target: { value: "10000" } });

  expect(screen.getByText(/조건에 맞는 식당이 없습니다/)).toBeInTheDocument();
  expect(screen.getByText(/리뷰 10,000개 이상인 식당이 없습니다/)).toBeInTheDocument();
  expect(screen.getByText(/기준을 낮추거나/)).toBeInTheDocument();
  expect(screen.getByTestId("map")).toHaveAttribute("data-pins", "");
});

test("기준 위치 전에 최소 리뷰 수를 바꿔도 검색하지 않고 선택은 이후 검색에 적용된다", async () => {
  allowLocation();
  fetchMock.mockResolvedValue(
    jsonResponse({
      restaurants: [restaurant("a", 4.8, 1500), restaurant("b", 4.6, 700)],
    })
  );
  render(<RestaurantSearch />);

  fireEvent.change(thresholdSelect(), { target: { value: "500" } });

  expect(fetchMock).not.toHaveBeenCalled();
  expect(thresholdSelect()).toHaveValue("500");

  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));
  await screen.findByText("식당 b");
  expect(screen.getByText("식당 a")).toBeInTheDocument();
});

test("고정값을 고르면 반경을 바꿔 다시 검색해도 유지되고 평균(자동)을 다시 고르면 평균으로 돌아간다", async () => {
  allowLocation();
  fetchMock.mockImplementation(async () =>
    jsonResponse({
      restaurants: [restaurant("a", 4.8, 1500), restaurant("c", 4.4, 3000)],
    })
  );
  render(<RestaurantSearch />);
  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));
  await screen.findByText("식당 c");
  // 평균 2250 → c만 보인다.
  expect(screen.queryByText("식당 a")).not.toBeInTheDocument();

  fireEvent.change(thresholdSelect(), { target: { value: "500" } });
  expect(screen.getByText("식당 a")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "2km" }));
  await waitFor(() => expect(restaurantRequests()).toHaveLength(2));
  await screen.findByText("식당 c");
  expect(thresholdSelect()).toHaveValue("500");
  expect(screen.getByText("식당 a")).toBeInTheDocument();

  fireEvent.change(thresholdSelect(), { target: { value: "auto" } });
  expect(screen.queryByText("식당 a")).not.toBeInTheDocument();
  expect(screen.getByText("식당 c")).toBeInTheDocument();
});

test("새로 검색하면 평균은 새로 받은 식당 기준으로 다시 계산된다", async () => {
  allowLocation();
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({
        restaurants: [restaurant("a", 4.8, 1000), restaurant("b", 4.6, 3000)],
      })
    )
    .mockResolvedValueOnce(
      jsonResponse({
        restaurants: [restaurant("x", 4.5, 100), restaurant("y", 4.4, 300)],
      })
    );
  render(<RestaurantSearch />);
  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));
  await screen.findByText("식당 b");
  expect(
    within(thresholdSelect()).getByRole("option", {
      name: "평균 2,000개 이상 (자동)",
    })
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "2km" }));

  await screen.findByText("식당 y");
  expect(
    within(thresholdSelect()).getByRole("option", {
      name: "평균 200개 이상 (자동)",
    })
  ).toBeInTheDocument();
  expect(screen.queryByText("식당 x")).not.toBeInTheDocument();
});

test("반경 안에서 식당을 하나도 받지 못하면 최소 리뷰 수와 무관하게 찾지 못했다고 안내한다", async () => {
  allowLocation();
  fetchMock.mockResolvedValue(jsonResponse({ restaurants: [] }));
  render(<RestaurantSearch />);

  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));

  expect(
    await screen.findByText(/반경 안에서 식당을 찾지 못했습니다/)
  ).toBeInTheDocument();
  expect(screen.queryByText(/리뷰 .*개 이상인 식당이 없습니다/)).not.toBeInTheDocument();
  expect(
    within(thresholdSelect()).getByRole("option", { name: "평균 (자동)" })
  ).toBeInTheDocument();
});

test("처음에는 한국어로 보이고 언어 전환으로 영어로 바꿨다가 되돌릴 수 있다", () => {
  render(<RestaurantSearch />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Dinner Nearby" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "내 위치" })).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("ko");

  fireEvent.click(screen.getByRole("button", { name: "English" }));

  expect(screen.getByRole("button", { name: "My location" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Min reviews" })).toBeInTheDocument();
  expect(screen.getByText("Choose a starting point")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "내 위치" })).not.toBeInTheDocument();
  expect(document.documentElement.lang).toBe("en");
  expect(
    screen.getByRole("heading", { level: 1, name: "Dinner Nearby" })
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "한국어" }));

  expect(screen.getByRole("button", { name: "내 위치" })).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("ko");
});

test("기준 위치가 있을 때 언어를 바꾸면 그 언어의 식당 이름을 받으려고 다시 검색하고 목록 문구도 바뀐다", async () => {
  allowLocation();
  fetchMock.mockImplementation(async () =>
    jsonResponse({ restaurants: [restaurant("a", 4.8, 1234)] })
  );
  render(<RestaurantSearch />);
  fireEvent.click(screen.getByRole("button", { name: "내 위치" }));
  await screen.findByText(/리뷰 1,234개/);

  fireEvent.click(screen.getByRole("button", { name: "English" }));

  await waitFor(() =>
    expect(restaurantRequests()).toEqual([
      "/api/restaurants?lat=37.5665&lng=126.978&radius=1000&lang=ko",
      "/api/restaurants?lat=37.5665&lng=126.978&radius=1000&lang=en",
    ])
  );
  expect(await screen.findByText(/1,234 reviews/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Google Maps/ })).toHaveAttribute(
    "href",
    "https://maps.google.com/?cid=a"
  );
});

test("화면에는 제목 아래 소개 문단 같은 긴 설명이 없다", () => {
  render(<RestaurantSearch />);

  expect(screen.queryByText(/보여 드립니다/)).not.toBeInTheDocument();
  expect(document.querySelectorAll("main p, p").length).toBe(0);
});
