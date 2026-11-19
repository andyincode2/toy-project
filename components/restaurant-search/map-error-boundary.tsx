"use client";

import { Component, type ReactNode } from "react";

/** 지도 그리기에서 난 오류가 페이지 전체를 무너뜨리지 않게 막는다. */
export class MapErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
