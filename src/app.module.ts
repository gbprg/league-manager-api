import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { CompetitionsModule } from './competitions/competitions.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { PlayersModule } from './players/players.module.js';
import { EnrollmentsModule } from './enrollments/enrollments.module.js';
import { PhasesModule } from './phases/phases.module.js';
import { GroupsModule } from './groups/groups.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { ResultsModule } from './results/results.module.js';
import { StandingsModule } from './standings/standings.module.js';
import { DisciplinaryModule } from './disciplinary/disciplinary.module.js';
import { PhotosModule } from './photos/photos.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 60,
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        // DATABASE_URL (Render/Heroku) tem prioridade; senão DB_HOST/DB_PORT/...
        ...(config.get<string>('DATABASE_URL')
          ? { url: config.get<string>('DATABASE_URL') }
          : {
              host: config.get<string>('DB_HOST', 'localhost'),
              port: config.get<number>('DB_PORT', 5434),
              username: config.get<string>('DB_USER', 'league_user'),
              password: config.get<string>('DB_PASSWORD', 'league_pass'),
              database: config.get<string>('DB_NAME', 'league_manager'),
            }),
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CompetitionsModule,
    TeamsModule,
    PlayersModule,
    EnrollmentsModule,
    PhasesModule,
    GroupsModule,
    MatchesModule,
    ResultsModule,
    StandingsModule,
    DisciplinaryModule,
    PhotosModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
