import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlayers1700000000003 implements MigrationInterface {
  name = 'CreatePlayers1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "players" (
        "id"              UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "full_name"       VARCHAR(180)  NOT NULL,
        "birth_date"      DATE          NOT NULL,
        "document_number" VARCHAR(50),
        "position"        VARCHAR(30)   NOT NULL DEFAULT 'MEIO_CAMPO',
        "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_players" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_players_full_name" ON "players" ("full_name")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "players"`);
  }
}
