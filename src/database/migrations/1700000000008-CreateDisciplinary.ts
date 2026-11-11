import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDisciplinary1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE disciplinary_record_type AS ENUM ('ADVERTENCIA', 'MULTA', 'SUSPENSAO');

      CREATE TABLE disciplinary_records (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        competition_id          UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
        competition_player_id   UUID NOT NULL REFERENCES competition_players(id) ON DELETE CASCADE,
        match_id      UUID REFERENCES matches(id) ON DELETE SET NULL,
        record_type   disciplinary_record_type NOT NULL,
        description   TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_disciplinary_records_competition ON disciplinary_records(competition_id);
      CREATE INDEX idx_disciplinary_records_player ON disciplinary_records(competition_player_id);

      CREATE TABLE disciplinary_suspensions (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        record_id     UUID NOT NULL UNIQUE REFERENCES disciplinary_records(id) ON DELETE CASCADE,
        games_total   INTEGER NOT NULL DEFAULT 1,
        games_served  INTEGER NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT games_total_positive CHECK (games_total > 0),
        CONSTRAINT games_served_lte_total CHECK (games_served <= games_total)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS disciplinary_suspensions;
      DROP TABLE IF EXISTS disciplinary_records;
      DROP TYPE IF EXISTS disciplinary_record_type;
    `);
  }
}
