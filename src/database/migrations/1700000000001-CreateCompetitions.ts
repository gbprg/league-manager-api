import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompetitions1700000000001 implements MigrationInterface {
  name = 'CreateCompetitions1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "competitions" (
        "id"           UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "name"         VARCHAR(150)  NOT NULL,
        "slug"         VARCHAR(180)  NOT NULL,
        "description"  TEXT,
        "logo_url"     TEXT,
        "start_date"   DATE          NOT NULL,
        "end_date"     DATE          NOT NULL,
        "location"     VARCHAR(200)  NOT NULL DEFAULT '',
        "regulation"   TEXT,
        "max_teams"    INTEGER,
        "category"     VARCHAR(100)  NOT NULL DEFAULT '',
        "age_group"    VARCHAR(100)  NOT NULL DEFAULT '',
        "format"       VARCHAR(50)   NOT NULL DEFAULT 'PONTOS_CORRIDOS',
        "status"       VARCHAR(30)   NOT NULL DEFAULT 'PLANEJADA',
        "points_win"   INTEGER       NOT NULL DEFAULT 3,
        "points_draw"  INTEGER       NOT NULL DEFAULT 1,
        "points_loss"  INTEGER       NOT NULL DEFAULT 0,
        "is_published" BOOLEAN       NOT NULL DEFAULT false,
        "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_competitions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_competitions_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_competitions_status" ON "competitions" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_competitions_is_published" ON "competitions" ("is_published")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "competitions"`);
  }
}
