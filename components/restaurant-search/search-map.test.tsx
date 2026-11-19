import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { SearchMap } from "./search-map";

// 지도 라이브러리는 외부 경계다. 지도 렌더링 중 오류가 나는 상황을 만든다.
vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Map: () => {
    throw new Error("지도 초기화 실패");
  },
  AdvancedMarker: () => null,
  Pin: () => null,
  useMap: () => null,
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY", "test-browser-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test("지도가 오류로 그려지지 못해도 페이지는 유지되고 지도 오류 안내가 보인다", () => {
  render(
    <div>
      <p>식당 목록은 계속 보인다</p>
      <SearchMap origin={null} radius={1000} restaurants={[]} language="ko" onPick={() => {}} />
    </div>
  );

  expect(screen.getByText("식당 목록은 계속 보인다")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(/지도를 불러오지 못했습니다/);
});

test("영어로 보면 지도 오류 안내도 영어다", () => {
  render(
    <SearchMap origin={null} radius={1000} restaurants={[]} language="en" onPick={() => {}} />
  );

  expect(screen.getByRole("alert")).toHaveTextContent(/Couldn't load the map/);
});

test("지도용 API 키가 없으면 키 설정 안내를 보여 준다", () => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY", "");

  render(
    <SearchMap origin={null} radius={1000} restaurants={[]} language="ko" onPick={() => {}} />
  );

  expect(screen.getByRole("alert")).toHaveTextContent(/NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY/);
});
