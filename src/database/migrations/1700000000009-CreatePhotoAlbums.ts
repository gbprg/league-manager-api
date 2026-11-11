import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhotoAlbums1700000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE photo_albums (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
        title          VARCHAR(150) NOT NULL,
        description    TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_photo_albums_competition ON photo_albums(competition_id);

      CREATE TABLE photos (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        album_id   UUID NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
        image_url  TEXT NOT NULL,
        caption    VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_photos_album ON photos(album_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS photos;
      DROP TABLE IF EXISTS photo_albums;
    `);
  }
}
