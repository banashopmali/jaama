import { Injectable, Optional } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import {
  PaymentProvider,
  PaymentProviderConfig,
  PaymentProviderType,
  PaymentDomainError,
} from "./provider.interface";
import { MockPaymentProvider } from "./providers/mock-payment.provider";

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers = new Map<PaymentProviderType, PaymentProvider>();

  constructor() {
    // Register default mock provider for deterministic local & test execution
    this.register(new MockPaymentProvider());
  }

  public register(provider: PaymentProvider): void {
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
    const provider = this.registry.get(providerType);
    if (!provider) {
      throw new PaymentDomainError(
        "PROVIDER_UNAVAILABLE",
        `Payment provider '${providerType}' is not registered in the system.`
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

    // If mock provider in test/dev environment and no config row yet, auto-provision default sandbox config
    if (!config && providerType === "mock") {
      config = await this.prismaClient.paymentProviderConfig.create({
        data: {
          organizationId,
          provider: "mock",
          isEnabled: true,
          isTestMode: true,
          webhookSecret: "mock_secret_default",
          merchantId: `mock_merchant_${organizationId}`,
          metadataJson: JSON.stringify({ autoCreated: true }),
        },
      });
    }

    if (!config || !config.isEnabled) {
      throw new PaymentDomainError(
        "PROVIDER_NOT_CONFIGURED",
        `Payment provider '${providerType}' is not enabled or configured for tenant '${organizationId}'.`
      );
    }

    return {
      provider,
      config: config as PaymentProviderConfig,
    };
  }
}
