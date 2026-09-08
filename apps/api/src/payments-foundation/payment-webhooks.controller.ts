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
import { PaymentProviderType } from "./provider.interface";

@Controller("api/v1/payments-foundation/webhooks")
export class PaymentWebhooksController {
  constructor(@Optional() private readonly webhookService?: WebhookEventService) {}

  @Post(":provider")
  @HttpCode(200)
  public async handleWebhook(
    @Param("provider") provider: PaymentProviderType,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: any,
    @Req() req: any
  ) {
    const rawBody = req.rawBody || JSON.stringify(body);
    return this.webhookService!.handleWebhook(provider, headers, rawBody, body);
  }
}
