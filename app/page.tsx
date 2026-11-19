import { RestaurantSearch } from "@/components/restaurant-search/restaurant-search";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
          맛집 찾기
        </h1>
        <p className="text-sm text-muted-foreground">
          기준 위치와 반경을 정하면, 구글 리뷰가 100개 이상인 식당을 평점이 높은
          순으로 보여 드립니다.
        </p>
      </header>
      <RestaurantSearch />
    </main>
  );
}
