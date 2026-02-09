import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { Scan } from './entities/scan.entity';
import { Project } from './entities/project.entity';
import { Vulnerability } from './entities/vulnerability.entity';
import { ScanFile } from './entities/scan-file.entity';
import { ScansModule } from './scans/scans.module';
import { VulnerabilitiesModule } from './vulnerabilities/vulnerabilities.module';
import { ProjectsModule } from './projects/projects.module';
import { AuthModule } from './auth/auth.module';
import { User } from './entities/user.entity';
import { ProjectMember } from './entities/project-member.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/securescanner',
      entities: [Project, Scan, Vulnerability, ScanFile, User, ProjectMember],
      synchronize: false,
      logging: false,
    }),
    AuthModule,
    ScansModule,
    VulnerabilitiesModule,
    ProjectsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
