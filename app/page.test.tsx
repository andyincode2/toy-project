import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("홈 화면은 Dinner Nearby 제목과 기준 위치를 정하는 방법을 보여 준다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Dinner Nearby" })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "내 위치" })).toBeInTheDocument();
  expect(
    screen.getByRole("textbox", { name: "장소 이름이나 주소" })
  ).toBeInTheDocument();
  expect(screen.getByText("기준 위치를 정해 주세요")).toBeInTheDocument();
});
