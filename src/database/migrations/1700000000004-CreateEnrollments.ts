import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnrollments1700000000004 implements MigrationInterface {
  name = 'CreateEnrollments1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // competition_teams
    await queryRunner.query(`
      CREATE TABLE "competition_teams" (
        "id"                  UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "competition_id"      UUID          NOT NULL,
        "team_id"             UUID          NOT NULL,
        "registration_status" VARCHAR(30)   NOT NULL DEFAULT 'ATIVA',
        "registered_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_competition_teams" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_competition_teams" UNIQUE ("competition_id", "team_id"),
        CONSTRAINT "FK_ct_competition" FOREIGN KEY ("competition_id")
          REFERENCES "competitions"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_ct_team" FOREIGN KEY ("team_id")
          REFERENCES "teams"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_ct_competition" ON "competition_teams" ("competition_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_ct_team" ON "competition_teams" ("team_id")`);

    // competition_players
    await queryRunner.query(`
      CREATE TABLE "competition_players" (
        "id"                  UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "competition_id"      UUID          NOT NULL,
        "team_id"             UUID          NOT NULL,
        "player_id"           UUID          NOT NULL,
        "registration_status" VARCHAR(30)   NOT NULL DEFAULT 'PENDENTE',
        "shirt_number"        INTEGER,
        "approved_at"         TIMESTAMPTZ,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_competition_players" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_competition_players" UNIQUE ("competition_id", "player_id"),
        CONSTRAINT "FK_cp_competition" FOREIGN KEY ("competition_id")
          REFERENCES "competitions"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_cp_team" FOREIGN KEY ("team_id")
          REFERENCES "teams"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_cp_player" FOREIGN KEY ("player_id")
          REFERENCES "players"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_cp_competition" ON "competition_players" ("competition_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_cp_team" ON "competition_players" ("team_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_cp_player" ON "competition_players" ("player_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "competition_players"`);
    await queryRunner.query(`DROP TABLE "competition_teams"`);
  }
}
