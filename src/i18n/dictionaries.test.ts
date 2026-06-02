import { describe, expect, it } from "vitest";
import { getDictionary, parseLocale } from "./dictionaries";

describe("i18n dictionaries", () => {
  it("falls back to Spanish and exposes English labels", () => {
    expect(parseLocale("fr")).toBe("es");
    expect(getDictionary("es").common.brand).toBe("MultiArqqManager");
    expect(getDictionary("en").login.submit).toBe("Sign in");
  });
});
