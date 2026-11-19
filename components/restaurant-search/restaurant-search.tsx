"use client";

import { useEffect, useRef, useState } from "react";
import {
  RiCrosshair2Line,
  RiErrorWarningLine,
  RiRestaurantLine,
  RiSearchLine,
} from "@remixicon/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LANGUAGES, messages } from "@/lib/restaurant-search/messages";
import {
  averageReviewCount,
  rankRestaurants,
  REVIEW_COUNT_OPTIONS,
} from "@/lib/restaurant-search/rank";
import type {
  Language,
  LatLng,
  Place,
  Restaurant,
} from "@/lib/restaurant-search/types";

import { RestaurantList } from "./restaurant-list";
import { SearchMap } from "./search-map";

const RADIUS_OPTIONS = [
  { meters: 500, label: "500m" },
  { meters: 1000, label: "1km" },
  { meters: 2000, label: "2km" },
  { meters: 3000, label: "3km" },
];
const DEFAULT_RADIUS = 1000;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; restaurants: Restaurant[] }
  | { status: "error" };

type Notice = { title: string; description?: string };

export function RestaurantSearch() {
  const [language, setLanguage] = useState<Language>("ko");
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  // "auto"이면 검색 결과의 평균 리뷰 수를 쓰고, 숫자이면 사용자가 고른 고정값이다.
  const [minReviews, setMinReviews] = useState<"auto" | number>("auto");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const latestRequest = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  const text = messages[language];
  const locale = language === "ko" ? "ko-KR" : "en-US";

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  async function searchRestaurants(
    point: LatLng,
    meters: number,
    lang: Language = language
  ) {
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    const requestId = ++latestRequest.current;
    setSearch({ status: "loading" });

    try {
      const response = await fetch(
        `/api/restaurants?lat=${point.lat}&lng=${point.lng}&radius=${meters}&lang=${lang}`,
        { signal: controller.signal }
      );
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data: { restaurants: Restaurant[] } = await response.json();
      // 더 늦게 요청한 검색이 있으면 이 결과는 버린다.
      if (requestId !== latestRequest.current) return;
      setSearch({ status: "success", restaurants: data.restaurants });
    } catch {
      if (requestId !== latestRequest.current) return;
      setSearch({ status: "error" });
    }
  }

  function chooseOrigin(point: LatLng) {
    setNotice(null);
    setOrigin(point);
    void searchRestaurants(point, radius);
  }

  function changeRadius(meters: number) {
    setRadius(meters);
    if (origin) void searchRestaurants(origin, meters);
  }

  function changeLanguage(next: Language) {
    setLanguage(next);
    setNotice(null);
    // 식당 이름을 그 언어로 다시 받는다.
    if (origin) void searchRestaurants(origin, radius, next);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setNotice(text.locationFailed);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        chooseOrigin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      (error) =>
        setNotice(error.code === 1 ? text.locationDenied : text.locationFailed)
    );
  }

  async function submitPlace(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    try {
      const response = await fetch(`/api/places?q=${encodeURIComponent(value)}`);
      if (response.status === 404) {
        setNotice(text.placeNotFound);
        return;
      }
      if (!response.ok) throw new Error(`status ${response.status}`);
      const place: Place = await response.json();
      chooseOrigin(place.location);
    } catch {
      setNotice(text.placeLookupFailed);
    }
  }

  const received = search.status === "success" ? search.restaurants : [];
  const average = averageReviewCount(received);
  const minReviewCount = minReviews === "auto" ? (average ?? 0) : minReviews;
  const restaurants = rankRestaurants(received, minReviewCount);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Dinner Nearby
        </h1>
        <ToggleGroup
          variant="outline"
          size="sm"
          aria-label={text.languageLabel}
          value={[language]}
          onValueChange={(values) => {
            const next = LANGUAGES.find((l) => l.code === values[0]);
            if (next) changeLanguage(next.code);
          }}
        >
          {LANGUAGES.map((l) => (
            <ToggleGroupItem key={l.code} value={l.code}>
              {l.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <form onSubmit={submitPlace} className="flex min-w-48 flex-1 gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={text.placePlaceholder}
              aria-label={text.placeLabel}
            />
            <Button type="submit" variant="outline">
              <RiSearchLine aria-hidden data-icon="inline-start" />
              {text.search}
            </Button>
          </form>
          <Button type="button" onClick={useCurrentLocation}>
            <RiCrosshair2Line aria-hidden data-icon="inline-start" />
            {text.locate}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            variant="outline"
            value={[String(radius)]}
            onValueChange={(values) => {
              const next = Number(values[0]);
              if (next) changeRadius(next);
            }}
            aria-label={text.radiusLabel}
          >
            {RADIUS_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.meters} value={String(option.meters)}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <label htmlFor="min-review-count" className="sr-only">
            {text.minReviewsLabel}
          </label>
          <NativeSelect
            id="min-review-count"
            value={minReviews}
            onChange={(event) =>
              setMinReviews(
                event.target.value === "auto" ? "auto" : Number(event.target.value)
              )
            }
          >
            <NativeSelectOption value="auto">
              {average === null
                ? text.minReviewsAuto
                : text.minReviewsAutoWith(average.toLocaleString(locale))}
            </NativeSelectOption>
            {REVIEW_COUNT_OPTIONS.map((count) => (
              <NativeSelectOption key={count} value={count}>
                {text.minReviewsFixed(count.toLocaleString(locale))}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {notice && (
          <Alert variant="destructive">
            <RiErrorWarningLine aria-hidden />
            <AlertTitle>{notice.title}</AlertTitle>
            {notice.description && (
              <AlertDescription>{notice.description}</AlertDescription>
            )}
          </Alert>
        )}
      </section>

      <SearchMap
        origin={origin}
        radius={radius}
        restaurants={restaurants}
        language={language}
        onPick={chooseOrigin}
      />

      <section>
        {search.status === "idle" && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiRestaurantLine aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{text.idle}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}

        {search.status === "loading" && (
          <div role="status" className="flex flex-col gap-2">
            <span className="sr-only">{text.loading}</span>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {search.status === "error" && (
          <Alert variant="destructive">
            <RiErrorWarningLine aria-hidden />
            <AlertTitle>{text.errorTitle}</AlertTitle>
            <AlertDescription>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => origin && void searchRestaurants(origin, radius)}
              >
                {text.retry}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {search.status === "success" && restaurants.length === 0 && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiRestaurantLine aria-hidden />
              </EmptyMedia>
              <EmptyTitle>{text.emptyTitle}</EmptyTitle>
              <EmptyDescription>
                {received.length === 0
                  ? text.emptyNone
                  : text.emptyBelowMin(minReviewCount.toLocaleString(locale))}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {search.status === "success" && restaurants.length > 0 && (
          <RestaurantList
            restaurants={restaurants}
            messages={text}
            language={language}
          />
        )}
      </section>
    </div>
  );
}
