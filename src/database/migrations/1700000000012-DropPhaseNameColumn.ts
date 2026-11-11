import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPhaseNameColumn1700000000012 implements MigrationInterface {
  name = 'DropPhaseNameColumn1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "competition_phases" DROP COLUMN IF EXISTS "name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "competition_phases" ADD COLUMN "name" VARCHAR(100) NOT NULL DEFAULT ''`,
    );
  }
}
