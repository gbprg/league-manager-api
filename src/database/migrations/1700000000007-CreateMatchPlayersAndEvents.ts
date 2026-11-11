import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatchPlayersAndEvents1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "match_players" (
        "id"                    UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "match_id"              UUID        NOT NULL,
        "competition_player_id" UUID        NOT NULL,
        "is_starter"            BOOLEAN     NOT NULL DEFAULT true,
        "is_goalkeeper"         BOOLEAN     NOT NULL DEFAULT false,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_match_players" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_match_player" UNIQUE ("match_id", "competition_player_id"),
        CONSTRAINT "FK_mp_match" FOREIGN KEY ("match_id")
          REFERENCES "matches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mp_competition_player" FOREIGN KEY ("competition_player_id")
          REFERENCES "competition_players"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_mp_match" ON "match_players" ("match_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_mp_cp" ON "match_players" ("competition_player_id")`);

    await queryRunner.query(`
      CREATE TABLE "match_events" (
        "id"              UUID        NOT NULL DEFAULT uuid_generate_v4(),
        "match_id"        UUID        NOT NULL,
        "match_player_id" UUID,
        "team_id"         UUID        NOT NULL,
        "event_type"      VARCHAR(30) NOT NULL,
        "event_minute"    INTEGER,
        "description"     TEXT,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_match_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_me_match" FOREIGN KEY ("match_id")
          REFERENCES "matches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_me_match_player" FOREIGN KEY ("match_player_id")
          REFERENCES "match_players"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_me_team" FOREIGN KEY ("team_id")
          REFERENCES "teams"("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_me_match" ON "match_events" ("match_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_me_type" ON "match_events" ("match_id", "event_type")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "match_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "match_players"`);
  }
}
