import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./brand-logo";

describe("BrandLogo", () => {
  it("renders the MultiArqqManager brand and accessible SVG", () => {
    render(<BrandLogo />);

    expect(screen.getByText("MultiArqqManager")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "MultiArqqManager logo" })).toBeInTheDocument();
  });
});
