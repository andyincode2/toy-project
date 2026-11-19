import type { Restaurant } from "./types";

/** 평점순 목록에 넣는 식당의 최소 구글 리뷰 수. 임시값이라 이 상수 한 곳에서 바꾼다. */
export const MIN_REVIEW_COUNT = 100;

export function rankRestaurants(restaurants: Restaurant[]): Restaurant[] {
  return restaurants
    .filter((restaurant) => restaurant.reviewCount >= MIN_REVIEW_COUNT)
    .sort(
      (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount
    );
}
