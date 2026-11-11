import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCompetitionAgeGroup1700000000014 implements MigrationInterface {
  name = 'DropCompetitionAgeGroup1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Preserva a faixa etária antiga como categoria quando a categoria estava vazia
    await queryRunner.query(
      `UPDATE "competitions" SET "category" = "age_group" WHERE "category" = '' AND "age_group" <> ''`,
    );
    await queryRunner.query(`ALTER TABLE "competitions" DROP COLUMN IF EXISTS "age_group"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "competitions" ADD COLUMN "age_group" VARCHAR(100) NOT NULL DEFAULT ''`,
    );
  }
}
