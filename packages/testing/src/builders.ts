import { UserContext } from "@jaama/types";
import { InMemoryDatabase, seedInMemoryDatabase } from "@jaama/database";
import { createSession } from "@jaama/auth";

export function createMockUserContext(overrides: Partial<UserContext> = {}): UserContext {
  return {
    actorId: "usr_mock_123",
    organizationId: "org_mock_456",
    membershipId: "mem_mock_789",
    permissions: ["read" as any, "sales.read", "sales.create"],
    ...overrides,
  };
}

export class TestFixtureBuilder {
  public static createSeededEnvironment(): { db: InMemoryDatabase; hamidouSessionToken: string } {
    const db = seedInMemoryDatabase();
    const session = createSession(db, "user-hamidou");
    return { db, hamidouSessionToken: session.token };
  }
}
