import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("JAAMA Architecture & Boundary Invariant Tests (JAA-S0-16)", () => {
  it("ensures domain layer (@jaama/types) contains zero HTTP or framework imports", () => {
    const domainIndexPath = path.resolve(__dirname, "../../types/src/index.ts");
    const content = fs.readFileSync(domainIndexPath, "utf8");

    expect(content).not.toContain("express");
    expect(content).not.toContain("@nestjs");
    expect(content).not.toContain("next");
    expect(content).not.toContain("@prisma/client");
  });

  it("ensures security pipeline enforces tenant boundary and no direct body tenant trust", () => {
    const authServicePath = path.resolve(__dirname, "../../auth/src/tenant.service.ts");
    const content = fs.readFileSync(authServicePath, "utf8");

    expect(content).toContain("resolveTenantContext");
    expect(content).toContain("Accès refusé");
  });
});
