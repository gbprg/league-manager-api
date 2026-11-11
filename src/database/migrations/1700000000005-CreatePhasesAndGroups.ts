import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePhasesAndGroups1700000000005 implements MigrationInterface {
  name = 'CreatePhasesAndGroups1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // competition_phases
    await queryRunner.query(`
      CREATE TABLE "competition_phases" (
        "id"                  UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "competition_id"      UUID          NOT NULL,
        "name"                VARCHAR(100)  NOT NULL,
        "phase_type"          VARCHAR(30)   NOT NULL DEFAULT 'GROUP',
        "sequence"            INTEGER       NOT NULL DEFAULT 1,
        "qualification_count" INTEGER,
        "legs"                INTEGER       NOT NULL DEFAULT 1,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_competition_phases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_phases_competition" FOREIGN KEY ("competition_id")
          REFERENCES "competitions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_phases_competition" ON "competition_phases" ("competition_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_phases_sequence" ON "competition_phases" ("competition_id", "sequence")`);

    // competition_groups
    await queryRunner.query(`
      CREATE TABLE "competition_groups" (
        "id"         UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "phase_id"   UUID         NOT NULL,
        "name"       VARCHAR(50)  NOT NULL,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_competition_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_groups_phase" FOREIGN KEY ("phase_id")
          REFERENCES "competition_phases"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_groups_phase" ON "competition_groups" ("phase_id")`);

    // competition_group_teams
    await queryRunner.query(`
      CREATE TABLE "competition_group_teams" (
        "id"                  UUID  NOT NULL DEFAULT uuid_generate_v4(),
        "group_id"            UUID  NOT NULL,
        "competition_team_id" UUID  NOT NULL,
        CONSTRAINT "PK_competition_group_teams" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_group_team" UNIQUE ("group_id", "competition_team_id"),
        CONSTRAINT "FK_gteam_group" FOREIGN KEY ("group_id")
          REFERENCES "competition_groups"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_gteam_competition_team" FOREIGN KEY ("competition_team_id")
          REFERENCES "competition_teams"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_gteam_group" ON "competition_group_teams" ("group_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_gteam_ct" ON "competition_group_teams" ("competition_team_id")`);

    // competition_rules
    await queryRunner.query(`
      CREATE TABLE "competition_rules" (
        "id"             UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "competition_id" UUID         NOT NULL,
        "rule_type"      VARCHAR(50)  NOT NULL,
        "rule_value"     JSONB        NOT NULL DEFAULT '{}',
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_competition_rules" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rule_per_competition" UNIQUE ("competition_id", "rule_type"),
        CONSTRAINT "FK_rules_competition" FOREIGN KEY ("competition_id")
          REFERENCES "competitions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_rules_competition" ON "competition_rules" ("competition_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "competition_rules"`);
    await queryRunner.query(`DROP TABLE "competition_group_teams"`);
    await queryRunner.query(`DROP TABLE "competition_groups"`);
    await queryRunner.query(`DROP TABLE "competition_phases"`);
  }
}
