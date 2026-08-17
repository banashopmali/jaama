import { describe, it, expect } from "vitest";
import { jaamaTokens } from "../tokens";

describe("@jaama/ui Tokens Contract", () => {
  it("exports official JAAMA brand primary color", () => {
    expect(jaamaTokens.colors.brand.primary).toBe("#002B9A");
  });

  it("exports official JAAMA brand primary hover color", () => {
    expect(jaamaTokens.colors.brand.primaryHover).toBe("#00227B");
  });

  it("exports official JAAMA brand navy color", () => {
    expect(jaamaTokens.colors.brand.navy).toBe("#0B1936");
  });

  it("defines standard typography font family containing Plus Jakarta Sans", () => {
    expect(jaamaTokens.typography.fontFamily.sans[0]).toContain("font-plus-jakarta");
  });

  it("defines 4px grid spacing scale", () => {
    expect(jaamaTokens.spacing[1]).toBe("0.25rem");
    expect(jaamaTokens.spacing[4]).toBe("1rem");
    expect(jaamaTokens.spacing[12]).toBe("3rem");
  });

  it("defines generous control heights (40px, 44px, 48px)", () => {
    expect(jaamaTokens.controlHeights.sm).toBe("2.5rem");
    expect(jaamaTokens.controlHeights.md).toBe("2.75rem");
    expect(jaamaTokens.controlHeights.lg).toBe("3rem");
  });
});
