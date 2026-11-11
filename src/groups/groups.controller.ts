import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GroupsService } from './groups.service.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import { AddGroupTeamDto } from './dto/add-group-team.dto.js';
import { AutoGroupsDto } from './dto/auto-groups.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller()
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Post('phases/:phaseId/groups')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.service.create(phaseId, dto);
  }

  /** Cria N grupos e distribui as equipes da fase (sorteio opcional). */
  @Post('phases/:phaseId/groups/auto')
  @UseGuards(JwtAuthGuard)
  autoCreate(
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Body() dto: AutoGroupsDto,
  ) {
    return this.service.autoCreate(phaseId, dto);
  }

  @Get('phases/:phaseId/groups')
  findAll(@Param('phaseId', ParseUUIDPipe) phaseId: string) {
    return this.service.findAll(phaseId);
  }

  @Get('groups/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch('groups/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGroupDto) {
    return this.service.update(id, dto);
  }

  @Delete('groups/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  // ─── Group teams ──────────────────────────────────────────────────────────

  @Post('groups/:groupId/teams')
  @UseGuards(JwtAuthGuard)
  addTeam(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: AddGroupTeamDto,
  ) {
    return this.service.addTeam(groupId, dto);
  }

  @Delete('groups/:groupId/teams/:competitionTeamId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTeam(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('competitionTeamId', ParseUUIDPipe) competitionTeamId: string,
  ) {
    return this.service.removeTeam(groupId, competitionTeamId);
  }
}
