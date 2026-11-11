import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhaseMaxLosses1700000000018 implements MigrationInterface {
  name = 'AddPhaseMaxLosses1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "competition_phases" ADD COLUMN "max_losses" INTEGER`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "competition_phases" DROP COLUMN IF EXISTS "max_losses"`);
  }
}
