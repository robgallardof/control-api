import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RefreshControl } from "./refresh-control";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock })
}));

describe("RefreshControl", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes the dashboard only when the user selects Refresh", () => {
    render(<RefreshControl labels={{ refreshNow: "Actualizar", refreshing: "Actualizando" }} />);

    expect(refreshMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
