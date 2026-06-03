import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyableValue } from "./copyable-value";

describe("CopyableValue", () => {
  it("renders the complete value and copies it", async () => {
    const token = "KGM-ePrS1234567890FULLTOKENWITHOUTELLIPSISQXGZO1";
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    render(<CopyableValue value={token} labels={{ copy: "Copiar", copied: "Copiado" }} compact />);

    expect(screen.getByText(token)).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(token));
    expect(screen.getByRole("button", { name: "Copiado" })).toBeInTheDocument();
  });
});
