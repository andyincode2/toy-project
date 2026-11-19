import { RiExternalLinkLine, RiStarFill } from "@remixicon/react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/lib/restaurant-search/types";

export function RestaurantList({ restaurants }: { restaurants: Restaurant[] }) {
  return (
    <ol className="flex flex-col divide-y border">
      {restaurants.map((restaurant, index) => (
        <li
          key={restaurant.id}
          className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{restaurant.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <RiStarFill aria-hidden className="size-3.5" />
                <span className="font-medium text-foreground">
                  {restaurant.rating.toFixed(1)}
                </span>
                <span>· 리뷰 {restaurant.reviewCount.toLocaleString("ko-KR")}개</span>
              </span>
            </div>
          </div>
          <a
            href={restaurant.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            구글 지도에서 열기
            <RiExternalLinkLine aria-hidden data-icon="inline-end" />
          </a>
        </li>
      ))}
    </ol>
  );
}
