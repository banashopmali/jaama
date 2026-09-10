import { Module } from "@nestjs/common";
import { PaymentProviderRegistry, PaymentProviderResolver } from "./provider-registry";
import { PaymentIntentService } from "./payment-intent.service";
import { WebhookEventService } from "./webhook-event.service";
import { SettlementService } from "./settlement.service";
import { PaymentsFoundationController } from "./payments-foundation.controller";
import { PaymentWebhooksController } from "./payment-webhooks.controller";

import { PaymentFinalizationService } from "./payment-finalization.service";

@Module({
  controllers: [PaymentsFoundationController, PaymentWebhooksController],
  providers: [
    PaymentProviderRegistry,
    PaymentProviderResolver,
    PaymentFinalizationService,
    PaymentIntentService,
    WebhookEventService,
    SettlementService,
  ],
  exports: [
    PaymentProviderRegistry,
    PaymentProviderResolver,
    PaymentFinalizationService,
    PaymentIntentService,
    WebhookEventService,
    SettlementService,
  ],
})
export class PaymentsFoundationModule {}
