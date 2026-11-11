import { PublicCompetition } from '../common/guards/competition-visibility.guard.js';
import { toPage, toLimit } from '../common/interfaces/paginated.interface.js';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DisciplinaryService } from './disciplinary.service.js';
import { CreateDisciplinaryRecordDto } from './dto/create-disciplinary-record.dto.js';
import { UpdateDisciplinaryRecordDto } from './dto/update-disciplinary-record.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller()
export class DisciplinaryController {
  constructor(private readonly service: DisciplinaryService) {}

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Post('competitions/:competitionId/disciplinary')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: CreateDisciplinaryRecordDto,
  ) {
    return this.service.create(competitionId, dto);
  }

  @Patch('disciplinary/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDisciplinaryRecordDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete('disciplinary/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Patch('disciplinary/suspensions/:id/serve')
  @UseGuards(JwtAuthGuard)
  serveGame(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.serveGame(id);
  }

  @Patch('disciplinary/suspensions/:id/unserve')
  @UseGuards(JwtAuthGuard)
  unserveGame(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.unserveGame(id);
  }

  // ─── Consulta: registros completos só para o admin; o público vê apenas suspensões ativas ───

  @Get('competitions/:competitionId/disciplinary')
  @UseGuards(JwtAuthGuard)
  findAll(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Query('record_type') recordType?: string,
    @Query('team_id') teamId?: string,
    @Query('player_id') playerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(
      competitionId,
      { record_type: recordType, team_id: teamId, player_id: playerId },
      toPage(page),
      toLimit(limit),
    );
  }

  @Get('disciplinary/:id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get('competitions/:competitionId/disciplinary/suspensions/active')
  @PublicCompetition()
  getActiveSuspensions(@Param('competitionId', ParseUUIDPipe) competitionId: string) {
    return this.service.getActiveSuspensions(competitionId);
  }
}
