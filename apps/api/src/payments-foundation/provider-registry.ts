import * as crypto from "crypto";
import { Injectable, Optional } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import {
  PaymentProvider,
  PaymentProviderConfig,
  PaymentProviderType,
  PaymentDomainError,
} from "./provider.interface";
import { MockPaymentProvider } from "./providers/mock-payment.provider";

export function isMockProviderPermitted(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return (
    process.env.NODE_ENV === "test" ||
    process.env.ENABLE_MOCK_PAYMENT_PROVIDER === "true"
  );
}

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers = new Map<PaymentProviderType, PaymentProvider>();

  constructor() {
    // Mock provider is registered ONLY for controlled test/local execution
    if (isMockProviderPermitted()) {
      this.register(new MockPaymentProvider());
    }
  }

  public register(provider: PaymentProvider): void {
    if (provider.providerType === "mock" && !isMockProviderPermitted()) {
      throw new PaymentDomainError(
        "PROVIDER_UNAVAILABLE",
        "Mock payment provider registration is strictly forbidden in production"
      );
    }
    this.providers.set(provider.providerType, provider);
  }

  public get(providerType: PaymentProviderType): PaymentProvider | undefined {
    return this.providers.get(providerType);
  }

  public has(providerType: PaymentProviderType): boolean {
    return this.providers.has(providerType);
  }
}

@Injectable()
export class PaymentProviderResolver {
  constructor(
    private readonly registry: PaymentProviderRegistry,
    @Optional() private readonly prismaClient = defaultPrisma
  ) {}

  public async resolveProvider(
    organizationId: string,
    providerType: PaymentProviderType
  ): Promise<{ provider: PaymentProvider; config: PaymentProviderConfig }> {
    if (providerType === "mock" && !isMockProviderPermitted()) {
      throw new PaymentDomainError(
        "PROVIDER_UNAVAILABLE",
        "Mock payment provider is strictly disabled in production"
      );
    }

    const provider = this.registry.get(providerType);
    if (!provider) {
      throw new PaymentDomainError(
        "PROVIDER_UNAVAILABLE",
        `Payment provider '${providerType}' is not registered or enabled in this environment.`
      );
    }

    // Look up tenant configuration
    let config = await this.prismaClient.paymentProviderConfig.findUnique({
      where: {
        organizationId_provider: {
          organizationId,
          provider: providerType,
        },
      },
    });

    // In controlled test environments only, auto-provision sandboxed config if none exists
    if (!config && providerType === "mock" && process.env.NODE_ENV === "test") {
      config = await this.prismaClient.paymentProviderConfig.create({
        data: {
          organizationId,
          provider: "mock",
          isEnabled: true,
          isTestMode: true,
          webhookEndpointKey: crypto.randomUUID(),
          webhookSecret: crypto.randomBytes(24).toString("hex"),
          merchantId: `mock_merchant_${organizationId}`,
          metadataJson: JSON.stringify({ autoCreated: true, environment: "test" }),
        },
      });
    }

    if (!config || !config.isEnabled) {
      throw new PaymentDomainError(
        "PROVIDER_NOT_CONFIGURED",
        `Payment provider '${providerType}' is not configured or enabled for tenant '${organizationId}'.`
      );
    }

    return {
      provider,
      config: config as PaymentProviderConfig,
    };
  }

  public async resolveByWebhookEndpoint(
    providerType: PaymentProviderType,
    webhookEndpointKey: string
  ): Promise<{ provider: PaymentProvider; config: PaymentProviderConfig }> {
    if (providerType === "mock" && !isMockProviderPermitted()) {
      throw new PaymentDomainError(
        "PROVIDER_UNAVAILABLE",
        "Mock payment provider is strictly disabled in production"
      );
    }

    if (!webhookEndpointKey || typeof webhookEndpointKey !== "string" || webhookEndpointKey.trim() === "") {
      throw new PaymentDomainError(
        "PROVIDER_NOT_CONFIGURED",
        "Webhook endpoint key is required for deterministic tenant resolution"
      );
    }

    const config = await this.prismaClient.paymentProviderConfig.findFirst({
      where: {
        provider: providerType,
        webhookEndpointKey: webhookEndpointKey.trim(),
        isEnabled: true,
      },
    });

    if (!config) {
      throw new PaymentDomainError(
        "PROVIDER_NOT_CONFIGURED",
        `No active configuration found for provider '${providerType}' with the given webhook endpoint key.`
      );
    }

    if (!config.webhookSecret || config.webhookSecret.trim() === "") {
      throw new PaymentDomainError(
        "UNAUTHORIZED_PROVIDER_ACTION",
        `Webhook secret is not configured for provider '${providerType}'. Cannot verify signature.`
      );
    }

    const provider = this.registry.get(providerType);
    if (!provider) {
      throw new PaymentDomainError(
        "PROVIDER_UNAVAILABLE",
        `Payment provider '${providerType}' is not registered in this environment.`
      );
    }

    return {
      provider,
      config: config as PaymentProviderConfig,
    };
  }
}
