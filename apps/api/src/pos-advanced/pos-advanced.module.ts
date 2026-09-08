import { Module } from "@nestjs/common";
import { PosAdvancedController } from "./pos-advanced.controller";
import { PosAdvancedService } from "./pos-advanced.service";

@Module({
  controllers: [PosAdvancedController],
  providers: [PosAdvancedService],
  exports: [PosAdvancedService],
})
export class PosAdvancedModule {}
