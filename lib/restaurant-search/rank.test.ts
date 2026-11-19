import { expect, test } from "vitest";

import {
  averageReviewCount,
  rankRestaurants,
  REVIEW_COUNT_OPTIONS,
} from "./rank";
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

test("직접 고르는 최소 리뷰 수 선택지는 100부터 100,000까지 일곱 가지다", () => {
  expect(REVIEW_COUNT_OPTIONS).toEqual([
    100, 500, 1000, 5000, 10000, 50000, 100000,
  ]);
});

test("평균 리뷰 수는 식당들의 리뷰 수를 산술평균해 반올림한 값이다", () => {
  expect(
    averageReviewCount([
      restaurant("a", 4.5, 1000),
      restaurant("b", 4.5, 2000),
      restaurant("c", 4.5, 3001),
    ])
  ).toBe(2000);
  expect(
    averageReviewCount([restaurant("a", 4.5, 1), restaurant("b", 4.5, 2)])
  ).toBe(2);
});

test("식당이 없으면 평균 리뷰 수는 없다", () => {
  expect(averageReviewCount([])).toBeNull();
});

test("평균 리뷰 수를 최소 리뷰 수로 쓰면 가장 리뷰가 많은 식당은 항상 남는다", () => {
  const restaurants = [
    restaurant("a", 4.1, 120),
    restaurant("b", 4.9, 300),
    restaurant("c", 4.0, 9000),
  ];
  const average = averageReviewCount(restaurants)!;

  const ranked = rankRestaurants(restaurants, average);

  expect(ranked.map((r) => r.id)).toEqual(["c"]);
});

test("평점순 목록에는 리뷰가 최소 리뷰 수 이상인 식당만 들어간다", () => {
  const restaurants = [
    restaurant("a", 5.0, 3),
    restaurant("b", 4.5, 999),
    restaurant("c", 4.1, 1000),
    restaurant("d", 4.6, 3000),
  ];

  expect(rankRestaurants(restaurants, 1000).map((r) => r.id)).toEqual([
    "d",
    "c",
  ]);
  expect(rankRestaurants(restaurants, 100).map((r) => r.id)).toEqual([
    "d",
    "b",
    "c",
  ]);
});

test("최소 리뷰 수를 주지 않으면 거르지 않고 평점순으로만 정렬한다", () => {
  const ranked = rankRestaurants([
    restaurant("a", 4.0, 3),
    restaurant("b", 5.0, 3),
  ]);

  expect(ranked.map((r) => r.id)).toEqual(["b", "a"]);
});

test("평점순 목록은 평점이 높은 순이고 평점이 같으면 리뷰가 많은 식당이 앞이다", () => {
  const ranked = rankRestaurants(
    [
      restaurant("low", 4.2, 5000),
      restaurant("tie-few", 4.6, 200),
      restaurant("top", 4.8, 150),
      restaurant("tie-many", 4.6, 900),
    ],
    100
  );

  expect(ranked.map((r) => r.id)).toEqual([
    "top",
    "tie-many",
    "tie-few",
    "low",
  ]);
});

test("조건에 맞는 식당이 없으면 빈 목록을 돌려준다", () => {
  expect(rankRestaurants([restaurant("a", 5, 10)], 100)).toEqual([]);
  expect(rankRestaurants([], 100)).toEqual([]);
});

test("정렬은 넘겨받은 목록을 바꾸지 않는다", () => {
  const input = [restaurant("a", 4.0, 500), restaurant("b", 5.0, 500)];

  rankRestaurants(input, 100);

  expect(input.map((r) => r.id)).toEqual(["a", "b"]);
});
