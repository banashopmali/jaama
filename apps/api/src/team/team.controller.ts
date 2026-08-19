import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import { TeamService, InviteMemberDto, UpdateMemberRoleDto } from "./team.service";

@Controller("api/v1/team")
@UseGuards(AuthTenantGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get("members")
  @RequirePermission("members.read")
  public async listMembers(@Req() req: any): Promise<any[]> {
    return this.teamService.listMembers(req.userContext);
  }

  @Post("invite")
  @RequirePermission("members.manage")
  public async inviteMember(@Req() req: any, @Body() dto: InviteMemberDto): Promise<any> {
    return this.teamService.inviteMember(req.userContext, dto);
  }

  @Put("members/:id/role")
  @RequirePermission("members.manage")
  public async updateMemberRole(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateMemberRoleDto
  ): Promise<any> {
    return this.teamService.updateMemberRole(req.userContext, id, dto);
  }

  @Delete("members/:id")
  @RequirePermission("members.manage")
  public async deactivateMember(@Req() req: any, @Param("id") id: string): Promise<any> {
    return this.teamService.deactivateMember(req.userContext, id);
  }
}
