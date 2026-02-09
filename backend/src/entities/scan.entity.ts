import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Vulnerability } from './vulnerability.entity';
import { ScanFile } from './scan-file.entity';
import { User } from './user.entity';

@Entity('scans')
export class Scan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project) => project.scans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string;

  @Column({ length: 50 })
  status!: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds?: number;

  @Column({ name: 'total_files', type: 'int', default: 0 })
  totalFiles!: number;

  @Column({ name: 'files_processed', type: 'int', default: 0 })
  filesProcessed!: number;

  @Column({ name: 'scan_config', type: 'jsonb', nullable: true })
  scanConfig?: Record<string, unknown>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @OneToMany(() => Vulnerability, (vuln) => vuln.scan)
  vulnerabilities!: Vulnerability[];

  @OneToMany(() => ScanFile, (file) => file.scan)
  files!: ScanFile[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
