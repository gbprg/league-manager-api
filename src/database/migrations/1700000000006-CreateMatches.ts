import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatches1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id"             UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "competition_id" UUID          NOT NULL,
        "phase_id"       UUID          NOT NULL,
        "group_id"       UUID,
        "home_team_id"   UUID          NOT NULL,
        "away_team_id"   UUID          NOT NULL,
        "round_number"   INTEGER,
        "tie_id"         UUID,
        "leg_number"     INTEGER       NOT NULL DEFAULT 1,
        "scheduled_at"   TIMESTAMPTZ,
        "location"       VARCHAR(200),
        "home_score"     INTEGER,
        "away_score"     INTEGER,
        "status"         VARCHAR(30)   NOT NULL DEFAULT 'AGENDADA',
        "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_matches" PRIMARY KEY ("id"),
        CONSTRAINT "CK_matches_different_teams" CHECK ("home_team_id" <> "away_team_id"),
        CONSTRAINT "FK_matches_competition" FOREIGN KEY ("competition_id")
          REFERENCES "competitions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_matches_phase" FOREIGN KEY ("phase_id")
          REFERENCES "competition_phases"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_matches_group" FOREIGN KEY ("group_id")
          REFERENCES "competition_groups"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_matches_home_team" FOREIGN KEY ("home_team_id")
          REFERENCES "teams"("id"),
        CONSTRAINT "FK_matches_away_team" FOREIGN KEY ("away_team_id")
          REFERENCES "teams"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_matches_competition" ON "matches" ("competition_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_matches_phase" ON "matches" ("phase_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_matches_group" ON "matches" ("group_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_matches_status" ON "matches" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_matches_scheduled" ON "matches" ("scheduled_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "matches"`);
  }
}
