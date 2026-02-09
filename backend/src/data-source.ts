import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Project } from './entities/project.entity';
import { Scan } from './entities/scan.entity';
import { Vulnerability } from './entities/vulnerability.entity';
import { ScanFile } from './entities/scan-file.entity';
import { User } from './entities/user.entity';
import { ProjectMember } from './entities/project-member.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/securescanner',
  entities: [Project, Scan, Vulnerability, ScanFile, User, ProjectMember],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
});
