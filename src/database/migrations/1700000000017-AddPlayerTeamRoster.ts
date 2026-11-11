import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlayerTeamRoster1700000000017 implements MigrationInterface {
  name = 'AddPlayerTeamRoster1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "team_id" uuid`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "shirt_number" INTEGER`);
    await queryRunner.query(
      `ALTER TABLE "players" ADD CONSTRAINT "FK_players_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_players_team" ON "players" ("team_id")`);

    // Elenco inicial: a equipe e a camisa da inscrição mais recente de cada jogador
    await queryRunner.query(`
      UPDATE "players" p
         SET "team_id" = x.team_id, "shirt_number" = x.shirt_number
        FROM (
          SELECT DISTINCT ON (player_id) player_id, team_id, shirt_number
            FROM "competition_players"
           ORDER BY player_id, created_at DESC
        ) x
       WHERE x.player_id = p.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_players_team"`);
    await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT IF EXISTS "FK_players_team"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN IF EXISTS "shirt_number"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN IF EXISTS "team_id"`);
  }
}
