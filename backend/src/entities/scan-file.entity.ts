import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Scan } from './scan.entity';

@Entity('scan_files')
export class ScanFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Scan, (scan) => scan.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scan_id' })
  scan!: Scan;

  @Column({ name: 'scan_id', type: 'uuid' })
  scanId!: string;

  @Column({ name: 'file_path', length: 1000 })
  filePath!: string;

  @Column({ length: 50, nullable: true })
  language?: string;

  @Column({ name: 'lines_of_code', type: 'int', nullable: true })
  linesOfCode?: number;

  @Column({ name: 'vulnerability_count', type: 'int', default: 0 })
  vulnerabilityCount!: number;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt!: Date;
}
