import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlayerPhotoUrl1700000000010 implements MigrationInterface {
  name = 'AddPlayerPhotoUrl1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "photo_url" TEXT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "photo_url"`);
  }
}
