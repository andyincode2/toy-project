import { RiExternalLinkLine, RiStarFill } from "@remixicon/react";

import { buttonVariants } from "@/components/ui/button";
import type { Messages } from "@/lib/restaurant-search/messages";
import type { Language, Restaurant } from "@/lib/restaurant-search/types";
import { cn } from "@/lib/utils";

export function RestaurantList({
  restaurants,
  messages,
  language,
}: {
  restaurants: Restaurant[];
  messages: Messages;
  language: Language;
}) {
  const locale = language === "ko" ? "ko-KR" : "en-US";

  return (
    <ol className="flex flex-col divide-y border">
      {restaurants.map((restaurant, index) => (
        <li
          key={restaurant.id}
          className="flex items-center justify-between gap-3 p-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">
                {restaurant.name}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <RiStarFill aria-hidden className="size-3.5" />
                <span className="font-medium text-foreground">
                  {restaurant.rating.toFixed(1)}
                </span>
                <span>
                  · {messages.reviews(restaurant.reviewCount.toLocaleString(locale))}
                </span>
              </span>
            </div>
          </div>
          <a
            href={restaurant.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "shrink-0",
              buttonVariants({ variant: "outline", size: "sm" })
            )}
          >
            {messages.googleMaps}
            <RiExternalLinkLine aria-hidden data-icon="inline-end" />
          </a>
        </li>
      ))}
    </ol>
  );
}
