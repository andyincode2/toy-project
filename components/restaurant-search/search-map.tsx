/// <reference types="google.maps" />
"use client";

import { useEffect } from "react";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { LatLng, Restaurant } from "@/lib/restaurant-search/types";

import { MapErrorBoundary } from "./map-error-boundary";

export type SearchMapProps = {
  origin: LatLng | null;
  radius: number;
  restaurants: Restaurant[];
  onPick: (point: LatLng) => void;
};

// 기준 위치가 정해지기 전에 보여 줄 기본 지도 중심(서울)과 확대 정도.
const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };
const DEFAULT_ZOOM = 12;

/** 기준 위치 둘레에 반경 원을 그리고, 원이 한눈에 들어오도록 지도를 맞춘다. */
function RadiusCircle({ origin, radius }: { origin: LatLng; radius: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const circle = new google.maps.Circle({
      map,
      center: origin,
      radius,
      clickable: false,
      strokeWeight: 2,
      fillOpacity: 0.08,
    });
    const bounds = circle.getBounds();
    if (bounds) map.fitBounds(bounds);
    return () => circle.setMap(null);
  }, [map, origin, radius]);

  return null;
}

export function SearchMap({
  origin,
  radius,
  restaurants,
  onPick,
}: SearchMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY;

  if (!apiKey) {
    return (
      <Alert variant="destructive">
        <AlertTitle>지도를 표시할 수 없습니다</AlertTitle>
        <AlertDescription>
          지도용 API 키(NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY)가 설정되지
          않았습니다.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <MapErrorBoundary
      fallback={
        <Alert variant="destructive">
          <AlertTitle>지도를 불러오지 못했습니다</AlertTitle>
          <AlertDescription>
            지도 없이도 식당 목록은 계속 사용할 수 있습니다. 새로고침하면 지도를
            다시 불러옵니다.
          </AlertDescription>
        </Alert>
      }
    >
    <div className="h-80 w-full overflow-hidden border md:h-[28rem]">
      <APIProvider apiKey={apiKey} language="ko" region="KR">
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          onClick={(event) => {
            const point = event.detail.latLng;
            if (point) onPick({ lat: point.lat, lng: point.lng });
          }}
        >
          {origin && (
            <>
              <RadiusCircle origin={origin} radius={radius} />
              <AdvancedMarker position={origin} title="기준 위치">
                <Pin
                  background="var(--foreground)"
                  borderColor="var(--foreground)"
                  glyphColor="var(--background)"
                />
              </AdvancedMarker>
            </>
          )}
          {restaurants.map((restaurant, index) => (
            <AdvancedMarker
              key={restaurant.id}
              position={restaurant.location}
              title={restaurant.name}
            >
              <div className="flex size-6 items-center justify-center rounded-full border border-background bg-primary text-xs font-medium text-primary-foreground">
                {index + 1}
              </div>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
    </MapErrorBoundary>
  );
}
