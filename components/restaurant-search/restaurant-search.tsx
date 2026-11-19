"use client";

import { useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LatLng, Place, Restaurant } from "@/lib/restaurant-search/types";

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

type Notice = { title: string; description: string };

const LOCATION_DENIED: Notice = {
  title: "위치 권한이 거부되었습니다",
  description:
    "장소 이름이나 주소를 입력하거나 지도를 눌러 기준 위치를 정할 수 있습니다.",
};
const LOCATION_FAILED: Notice = {
  title: "현재 위치를 가져오지 못했습니다",
  description:
    "장소 이름이나 주소를 입력하거나 지도를 눌러 기준 위치를 정할 수 있습니다.",
};
const PLACE_NOT_FOUND: Notice = {
  title: "장소를 찾지 못했습니다",
  description: "장소 이름이나 주소를 다시 확인해 주세요.",
};
const PLACE_LOOKUP_FAILED: Notice = {
  title: "장소를 검색하지 못했습니다",
  description: "잠시 후 다시 시도해 주세요.",
};

export function RestaurantSearch() {
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const latestRequest = useRef(0);
  const abortController = useRef<AbortController | null>(null);

  async function searchRestaurants(point: LatLng, meters: number) {
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    const requestId = ++latestRequest.current;
    setSearch({ status: "loading" });

    try {
      const response = await fetch(
        `/api/restaurants?lat=${point.lat}&lng=${point.lng}&radius=${meters}`,
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

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setNotice(LOCATION_FAILED);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        chooseOrigin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      (error) => setNotice(error.code === 1 ? LOCATION_DENIED : LOCATION_FAILED)
    );
  }

  async function submitPlace(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;

    try {
      const response = await fetch(`/api/places?q=${encodeURIComponent(text)}`);
      if (response.status === 404) {
        setNotice(PLACE_NOT_FOUND);
        return;
      }
      if (!response.ok) throw new Error(`status ${response.status}`);
      const place: Place = await response.json();
      chooseOrigin(place.location);
    } catch {
      setNotice(PLACE_LOOKUP_FAILED);
    }
  }

  const restaurants = search.status === "success" ? search.restaurants : [];

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="기준 위치와 반경" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <form onSubmit={submitPlace} className="flex flex-1 gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="장소 이름이나 주소 (예: 서울역)"
              aria-label="장소 이름이나 주소"
            />
            <Button type="submit" variant="outline">
              <RiSearchLine aria-hidden data-icon="inline-start" />
              검색
            </Button>
          </form>
          <Button type="button" onClick={useCurrentLocation}>
            <RiCrosshair2Line aria-hidden data-icon="inline-start" />
            내 위치
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">반경</span>
          <ToggleGroup
            variant="outline"
            value={[String(radius)]}
            onValueChange={(values) => {
              const next = Number(values[0]);
              if (next) changeRadius(next);
            }}
            aria-label="반경"
          >
            {RADIUS_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.meters} value={String(option.meters)}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {notice && (
          <Alert variant="destructive">
            <RiErrorWarningLine aria-hidden />
            <AlertTitle>{notice.title}</AlertTitle>
            <AlertDescription>{notice.description}</AlertDescription>
          </Alert>
        )}
      </section>

      <SearchMap
        origin={origin}
        radius={radius}
        restaurants={restaurants}
        onPick={chooseOrigin}
      />

      <section aria-label="검색 결과">
        {search.status === "idle" && (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiRestaurantLine aria-hidden />
              </EmptyMedia>
              <EmptyTitle>기준 위치를 정해 주세요</EmptyTitle>
              <EmptyDescription>
                내 위치 버튼, 장소 이름이나 주소 입력, 지도 누르기 중 하나로 정하면
                반경 안의 식당을 평점순으로 보여 드립니다.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {search.status === "loading" && (
          <div role="status" className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">검색 중…</span>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {search.status === "error" && (
          <Alert variant="destructive">
            <RiErrorWarningLine aria-hidden />
            <AlertTitle>식당을 불러오지 못했습니다</AlertTitle>
            <AlertDescription>
              <p>잠시 후 다시 시도해 주세요.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => origin && void searchRestaurants(origin, radius)}
              >
                다시 시도
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
              <EmptyTitle>조건에 맞는 식당이 없습니다</EmptyTitle>
              <EmptyDescription>
                리뷰가 100개 이상인 식당이 반경 안에 없습니다. 반경을 넓혀 보세요.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {search.status === "success" && restaurants.length > 0 && (
          <RestaurantList restaurants={restaurants} />
        )}
      </section>
    </div>
  );
}
