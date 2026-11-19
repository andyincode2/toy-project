import { RestaurantSearch } from "@/components/restaurant-search/restaurant-search";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6">
      <RestaurantSearch />
    </main>
  );
}
