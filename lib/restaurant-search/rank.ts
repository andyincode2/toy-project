import type { Restaurant } from "./types";

/** 쓰는 사람이 고를 수 있는 최소 리뷰 수. */
export const REVIEW_COUNT_OPTIONS = [
  100, 500, 1000, 5000, 10000, 50000, 100000,
];

/**
 * 리뷰가 최소 리뷰 수 이상인 식당만 남겨 평점이 높은 순으로 정렬한다.
 * 평점이 같으면 리뷰가 많은 식당이 앞이다. 최소 리뷰 수를 생략하면 거르지 않는다.
 */
export function rankRestaurants(
  restaurants: Restaurant[],
  minReviewCount = 0
): Restaurant[] {
  return restaurants
    .filter((restaurant) => restaurant.reviewCount >= minReviewCount)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
}

/** 식당들의 리뷰 수 평균(반올림). 식당이 없으면 null. */
export function averageReviewCount(restaurants: Restaurant[]): number | null {
  if (restaurants.length === 0) return null;
  const total = restaurants.reduce((sum, r) => sum + r.reviewCount, 0);
  return Math.round(total / restaurants.length);
}
