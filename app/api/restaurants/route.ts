import { searchNearbyRestaurants } from "@/lib/restaurant-search/places";
import { rankRestaurants } from "@/lib/restaurant-search/rank";
import type { Language } from "@/lib/restaurant-search/types";

// 구글 Places API가 허용하는 반경의 상한(미터).
const MAX_RADIUS = 50000;

function parseNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = parseNumber(params.get("lat"));
  const lng = parseNumber(params.get("lng"));
  const radius = parseNumber(params.get("radius"));
  const language = params.get("lang") ?? "ko";

  if (
    lat === null ||
    lng === null ||
    radius === null ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    radius <= 0 ||
    radius > MAX_RADIUS ||
    (language !== "ko" && language !== "en")
  ) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "server_misconfigured" }, { status: 500 });
  }

  try {
    const restaurants = await searchNearbyRestaurants(
      { center: { lat, lng }, radius, language: language as Language },
      apiKey
    );
    // 최소 리뷰 수로 거르는 일은 화면이 맡는다. 받아 둔 식당을 다시 호출 없이 걸러 쓰기 위해서다.
    return Response.json({ restaurants: rankRestaurants(restaurants) });
  } catch {
    return Response.json({ error: "upstream_failed" }, { status: 502 });
  }
}
