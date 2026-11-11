import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchPenaltyScores1700000000016 implements MigrationInterface {
  name = 'AddMatchPenaltyScores1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "matches" ADD COLUMN "home_penalty_score" INTEGER`);
    await queryRunner.query(`ALTER TABLE "matches" ADD COLUMN "away_penalty_score" INTEGER`);
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "CK_matches_penalties_both_or_none" CHECK (("home_penalty_score" IS NULL) = ("away_penalty_score" IS NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "matches" DROP CONSTRAINT IF EXISTS "CK_matches_penalties_both_or_none"`,
    );
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN IF EXISTS "away_penalty_score"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN IF EXISTS "home_penalty_score"`);
  }
}
