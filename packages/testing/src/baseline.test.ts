import { describe, it, expect } from "vitest";
import { createMockUserContext } from "./index";

describe("JAAMA Testing Baseline", () => {
  it("creates valid mock user context", () => {
    const context = createMockUserContext();
    expect(context.actorId).toBe("usr_mock_123");
    expect(context.organizationId).toBe("org_mock_456");
    expect(context.permissions).toContain("read");
  });
});
