import { expect, test } from "vitest";

import { MIN_REVIEW_COUNT, rankRestaurants } from "./rank";
import type { Restaurant } from "./types";

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

test("평점순 목록에는 리뷰가 100개 이상인 식당만 들어간다", () => {
  const ranked = rankRestaurants([
    restaurant("a", 5.0, 3),
    restaurant("b", 4.5, 99),
    restaurant("c", 4.1, 100),
    restaurant("d", 4.6, 3000),
  ]);

  expect(MIN_REVIEW_COUNT).toBe(100);
  expect(ranked.map((r) => r.id)).toEqual(["d", "c"]);
});

test("평점순 목록은 평점이 높은 순이고 평점이 같으면 리뷰가 많은 식당이 앞이다", () => {
  const ranked = rankRestaurants([
    restaurant("low", 4.2, 5000),
    restaurant("tie-few", 4.6, 200),
    restaurant("top", 4.8, 150),
    restaurant("tie-many", 4.6, 900),
  ]);

  expect(ranked.map((r) => r.id)).toEqual([
    "top",
    "tie-many",
    "tie-few",
    "low",
  ]);
});

test("조건에 맞는 식당이 없으면 빈 목록을 돌려준다", () => {
  expect(rankRestaurants([restaurant("a", 5, 10)])).toEqual([]);
  expect(rankRestaurants([])).toEqual([]);
});
