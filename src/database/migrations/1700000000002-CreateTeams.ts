import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeams1700000000002 implements MigrationInterface {
  name = 'CreateTeams1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id"           UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "name"         VARCHAR(150)  NOT NULL,
        "slug"         VARCHAR(180)  NOT NULL,
        "logo_url"     TEXT,
        "manager_name" VARCHAR(150)  NOT NULL DEFAULT '',
        "city"         VARCHAR(100)  NOT NULL DEFAULT '',
        "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_teams_slug" UNIQUE ("slug")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "teams"`);
  }
}
