import {
  Controller,
  Post,
  Param,
  Req,
  Body,
  Headers,
  HttpCode,
  Optional,
} from "@nestjs/common";
import { WebhookEventService } from "./webhook-event.service";
import type { PaymentProviderType } from "./provider.interface";
import { PaymentDomainError } from "./provider.interface";

@Controller("api/v1/payments-foundation/webhooks")
export class PaymentWebhooksController {
  constructor(@Optional() private readonly webhookService?: WebhookEventService) {}

  @Post(":provider/:webhookEndpointKey")
  @HttpCode(200)
  public async handleWebhook(
    @Param("provider") provider: PaymentProviderType,
    @Param("webhookEndpointKey") webhookEndpointKey: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: any,
    @Req() req: any
  ) {
    const rawBody = req.rawBody ?? (Buffer.isBuffer(req.body) ? req.body : null);
    if (!rawBody) {
      throw new PaymentDomainError(
        "INVALID_SIGNATURE",
        "Raw request bytes are required for cryptographic signature verification"
      );
    }
    return this.webhookService!.handleWebhook(
      provider,
      webhookEndpointKey,
      headers,
      rawBody,
      body
    );
  }
}
