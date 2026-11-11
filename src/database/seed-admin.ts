/**
 * Seed script — cria o único administrador do sistema.
 * Uso: npx ts-node -r tsconfig-paths/register src/database/seed-admin.ts
 *
 * Lê as variáveis de ambiente de .env.
 * Não cria duplicata se o e-mail já existir.
 */

import 'reflect-metadata';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { AppDataSource } from './data-source.js';
import { AdminUser } from '../auth/entities/admin-user.entity.js';

dotenv.config();

async function seed() {
  await AppDataSource.initialize();

  const repo = AppDataSource.getRepository(AdminUser);

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administrador';

  if (!email || !password) {
    console.error('ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios no .env');
    process.exit(1);
  }

  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    console.log(`Administrador com e-mail "${email}" já existe. Nada a fazer.`);
    await AppDataSource.destroy();
    return;
  }

  const password_hash = await argon2.hash(password);
  const admin = repo.create({ name, email, password_hash });
  await repo.save(admin);

  console.log(`Administrador "${email}" criado com sucesso.`);
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
