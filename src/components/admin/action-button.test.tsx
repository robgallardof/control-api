import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionButton } from "./action-button";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock })
}));

describe("ActionButton", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses an in-app confirmation modal before running the action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", vi.fn());

    render(
      <ActionButton
        endpoint="/api/admin/licenses"
        body={{ id: "license-id", status: "blocked" }}
        label="Bloquear"
        kind="block"
        confirmMessage="Bloquear esta key?"
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Bloquear" }));

    expect(screen.getByRole("dialog", { name: "Bloquear" })).toBeInTheDocument();
    expect(screen.getByText("Bloquear esta key?")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/licenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "license-id", status: "blocked" })
    });
    expect(refreshMock).toHaveBeenCalled();
  });
});
