import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { GET } from "./route";

const SERVER_KEY = "test-server-key-abc123";

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
  return new Request(`http://localhost:3000/api/places?${query}`);
}

beforeEach(() => {
  vi.stubEnv("GOOGLE_MAPS_SERVER_API_KEY", SERVER_KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("장소 이름이나 주소로 찾은 첫 결과의 이름과 좌표를 돌려준다", async () => {
  stubGoogle({
    places: [
      {
        displayName: { text: "서울역", languageCode: "ko" },
        location: { latitude: 37.5547, longitude: 126.9707 },
      },
    ],
  });

  const response = await GET(request(`q=${encodeURIComponent("서울역")}`));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    name: "서울역",
    location: { lat: 37.5547, lng: 126.9707 },
  });
});

test("찾을 수 없는 입력은 404로 응답한다", async () => {
  stubGoogle({});

  const response = await GET(request("q=zzzzqqq"));

  expect(response.status).toBe(404);
});

test.each([["입력이 없음", ""], ["공백만 입력", "q=%20%20"]])(
  "잘못된 요청(%s)은 구글을 호출하지 않고 400으로 거절한다",
  async (_name, query) => {
    const fetchMock = stubGoogle({});

    const response = await GET(request(query));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  }
);

test("구글 호출이 실패하면 502로 응답하고 응답 본문에 서버 키가 들어가지 않는다", async () => {
  stubGoogle({}, 500);

  const response = await GET(request("q=seoul"));
  const text = await response.text();

  expect(response.status).toBe(502);
  expect(text).not.toContain(SERVER_KEY);
});
