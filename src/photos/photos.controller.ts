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
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotosService } from './photos.service.js';
import { CreateAlbumDto, UpdateAlbumDto } from './dto/create-album.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { imageUploadOptions } from '../common/upload.utils.js';

@Controller()
export class PhotosController {
  constructor(private readonly service: PhotosService) {}

  // ─── Albums — admin ─────────────────────────────────────────────────────

  @Post('competitions/:competitionId/albums')
  @UseGuards(JwtAuthGuard)
  createAlbum(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Body() dto: CreateAlbumDto,
  ) {
    return this.service.createAlbum(competitionId, dto);
  }

  @Patch('albums/:id')
  @UseGuards(JwtAuthGuard)
  updateAlbum(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAlbumDto) {
    return this.service.updateAlbum(id, dto);
  }

  @Delete('albums/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAlbum(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeAlbum(id);
  }

  // ─── Photos — admin ──────────────────────────────────────────────────────

  @Post('albums/:albumId/photos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  addPhoto(
    @Param('albumId', ParseUUIDPipe) albumId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('caption') caption?: string,
  ) {
    return this.service.addPhoto(albumId, file, caption);
  }

  @Delete('photos/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removePhoto(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removePhoto(id);
  }

  // ─── Albums — public ─────────────────────────────────────────────────────

  @Get('competitions/:competitionId/albums')
  @PublicCompetition()
  findAlbums(
    @Param('competitionId', ParseUUIDPipe) competitionId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAlbums(
      competitionId,
      { search },
      toPage(page),
      toLimit(limit),
    );
  }

  @Get('albums/:id')
  findAlbum(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findAlbum(id);
  }
}
