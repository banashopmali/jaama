export interface UserContext {
  actorId: string;
  organizationId: string;
  membershipId: string;
  permissions: string[];
}

export type CurrencyCode = "XOF" | "XAF" | "EUR" | "USD";
