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
  Optional,
} from "@nestjs/common";
import { AuthTenantGuard, RequirePermission } from "../common/auth-tenant.guard";
import {
  TeamService,
  InviteMemberDto,
  UpdateMemberRoleDto,
  AcceptInviteDto,
} from "./team.service";

@Controller("api/v1/team")
export class TeamController {
  private readonly teamService: TeamService;

  constructor(@Optional() teamService?: TeamService) {
    this.teamService = teamService || new TeamService();
  }


  @Get("members")
  @UseGuards(AuthTenantGuard)
  @RequirePermission("members.read")
  public async listMembers(@Req() req: any): Promise<any[]> {
    return this.teamService.listMembers(req.userContext);
  }

  @Post("invite")
  @UseGuards(AuthTenantGuard)
  @RequirePermission("members.manage")
  public async inviteMember(@Req() req: any, @Body() dto: InviteMemberDto): Promise<any> {
    return this.teamService.inviteMember(req.userContext, dto);
  }

  @Post("accept-invite")
  public async acceptInvite(@Body() dto: AcceptInviteDto): Promise<any> {
    return this.teamService.acceptInvite(dto);
  }

  @Put("members/:id/role")
  @UseGuards(AuthTenantGuard)
  @RequirePermission("members.manage")
  public async updateMemberRole(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateMemberRoleDto
  ): Promise<any> {
    return this.teamService.updateMemberRole(req.userContext, id, dto);
  }

  @Delete("members/:id")
  @UseGuards(AuthTenantGuard)
  @RequirePermission("members.manage")
  public async deactivateMember(@Req() req: any, @Param("id") id: string): Promise<any> {
    return this.teamService.deactivateMember(req.userContext, id);
  }
}
