import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ResultsService } from './results.service.js';
import { AddMatchPlayerDto } from './dto/add-match-player.dto.js';
import { CreateMatchEventDto } from './dto/create-match-event.dto.js';
import { FinalizeMatchDto } from './dto/finalize-match.dto.js';
import { AddTeamPlayersDto } from './dto/add-team-players.dto.js';
import { UpdateMatchPlayerDto } from './dto/update-match-player.dto.js';
import { WalkoverDto } from './dto/walkover.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller()
export class ResultsController {
  constructor(private readonly service: ResultsService) {}

  // ─── Súmula ───────────────────────────────────────────────────────────

  @Get('matches/:matchId/sumula')
  getSumula(@Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.service.getSumula(matchId);
  }

  // ─── Match players ────────────────────────────────────────────────────

  @Get('matches/:matchId/players')
  getPlayers(@Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.service.getMatchPlayers(matchId);
  }

  @Post('matches/:matchId/players')
  @UseGuards(JwtAuthGuard)
  addPlayer(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: AddMatchPlayerDto,
  ) {
    return this.service.addMatchPlayer(matchId, dto);
  }

  /** Relaciona todos os jogadores aprovados de uma equipe. */
  @Post('matches/:matchId/players/bulk')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  addTeamPlayers(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: AddTeamPlayersDto,
  ) {
    return this.service.addTeamPlayers(matchId, dto.team_id);
  }

  @Patch('matches/:matchId/players/:matchPlayerId')
  @UseGuards(JwtAuthGuard)
  updatePlayer(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Param('matchPlayerId', ParseUUIDPipe) matchPlayerId: string,
    @Body() dto: UpdateMatchPlayerDto,
  ) {
    return this.service.updateMatchPlayer(matchId, matchPlayerId, dto);
  }

  @Delete('matches/:matchId/players/:matchPlayerId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removePlayer(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Param('matchPlayerId', ParseUUIDPipe) matchPlayerId: string,
  ) {
    return this.service.removeMatchPlayer(matchId, matchPlayerId);
  }

  // ─── Match events ─────────────────────────────────────────────────────

  @Get('matches/:matchId/events')
  getEvents(@Param('matchId', ParseUUIDPipe) matchId: string) {
    return this.service.getMatchEvents(matchId);
  }

  @Post('matches/:matchId/events')
  @UseGuards(JwtAuthGuard)
  addEvent(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: CreateMatchEventDto,
  ) {
    return this.service.addMatchEvent(matchId, dto);
  }

  @Delete('match-events/:eventId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.service.removeMatchEvent(eventId);
  }

  // ─── Result / finalization ────────────────────────────────────────────

  @Post('matches/:matchId/result')
  @UseGuards(JwtAuthGuard)
  finalizeMatch(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: FinalizeMatchDto,
  ) {
    return this.service.finalizeMatch(matchId, dto);
  }

  @Post('matches/:matchId/walkover')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  walkover(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: WalkoverDto,
  ) {
    return this.service.registerWalkover(matchId, dto);
  }

  @Patch('matches/:matchId/result')
  @UseGuards(JwtAuthGuard)
  correctResult(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: FinalizeMatchDto,
  ) {
    return this.service.correctResult(matchId, dto);
  }
}
