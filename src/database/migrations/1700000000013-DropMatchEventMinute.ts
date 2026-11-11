import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropMatchEventMinute1700000000013 implements MigrationInterface {
  name = 'DropMatchEventMinute1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "match_events" DROP COLUMN IF EXISTS "event_minute"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "match_events" ADD COLUMN "event_minute" INT`);
  }
}
