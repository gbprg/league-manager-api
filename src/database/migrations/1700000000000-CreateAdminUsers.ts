import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminUsers1700000000000 implements MigrationInterface {
  name = 'CreateAdminUsers1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_users" (
        "id"            UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "name"          VARCHAR(150)      NOT NULL,
        "email"         VARCHAR(180)      NOT NULL,
        "password_hash" VARCHAR(255)      NOT NULL,
        "created_at"    TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_admin_users_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admin_users"`);
  }
}
