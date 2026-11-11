import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSlugColumns1700000000015 implements MigrationInterface {
  name = 'DropSlugColumns1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "competitions" DROP COLUMN IF EXISTS "slug"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "slug"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "competitions" ADD COLUMN "slug" VARCHAR(180)`);
    await queryRunner.query(`UPDATE "competitions" SET "slug" = "id"::text`);
    await queryRunner.query(`ALTER TABLE "competitions" ALTER COLUMN "slug" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "competitions" ADD CONSTRAINT "UQ_competitions_slug" UNIQUE ("slug")`);
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN "slug" VARCHAR(180)`);
    await queryRunner.query(`UPDATE "teams" SET "slug" = "id"::text`);
    await queryRunner.query(`ALTER TABLE "teams" ALTER COLUMN "slug" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "UQ_teams_slug" UNIQUE ("slug")`);
  }
}
