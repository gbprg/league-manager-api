import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unlink } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = join(__dirname, '..', '..', 'uploads');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// A extensão vem do tipo declarado (e permitido), nunca do nome enviado pelo cliente.
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const multerStorage = diskStorage({
  destination: UPLOADS_ROOT,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${EXT_BY_MIME[file.mimetype] ?? ''}`);
  },
});

/** Opções do multer: recusa tipo inválido e arquivo grande ANTES de gravar em disco. */
export const imageUploadOptions: MulterOptions = {
  storage: multerStorage,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new BadRequestException('Tipo de arquivo inválido. Use JPEG, PNG, WEBP ou GIF.'), false);
      return;
    }
    cb(null, true);
  },
};

/** Apaga o arquivo recém-enviado quando a operação falha depois do upload. */
export async function discardUpload(file?: Express.Multer.File): Promise<void> {
  if (file?.filename) await deleteUploadedFile(`/uploads/${file.filename}`);
}

export function validateImageUpload(file: Express.Multer.File): void {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new BadRequestException('Tipo de arquivo inválido. Use JPEG, PNG, WEBP ou GIF.');
  }
  if (file.size > MAX_BYTES) {
    throw new BadRequestException('Arquivo muito grande. Máximo 8 MB.');
  }
}

export async function deleteUploadedFile(imageUrl: string | null): Promise<void> {
  if (!imageUrl) return;
  try {
    const filename = imageUrl.replace('/uploads/', '');
    await unlink(join(UPLOADS_ROOT, filename));
  } catch {
    // file may already be missing
  }
}
