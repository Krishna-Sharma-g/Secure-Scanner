import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scan } from '../entities/scan.entity';
import { ScanFile } from '../entities/scan-file.entity';
import { Vulnerability } from '../entities/vulnerability.entity';
import { CreateScanDto } from './dto/create-scan.dto';
import { CreateScanFileDto } from './dto/create-scan-file.dto';
import { CreateVulnerabilityDto } from './dto/create-vulnerability.dto';
import { UpdateScanDto } from './dto/update-scan.dto';
import { ScanEventsService } from './scan-events.service';
import { CreateTestScanDto } from './dto/create-test-scan.dto';
import { Project } from '../entities/project.entity';

@Injectable()
export class ScansService {
  constructor(
    @InjectRepository(Scan)
    private readonly scans: Repository<Scan>,
    @InjectRepository(ScanFile)
    private readonly scanFiles: Repository<ScanFile>,
    @InjectRepository(Vulnerability)
    private readonly vulnerabilities: Repository<Vulnerability>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    private readonly events: ScanEventsService,
  ) {}

  async create(dto: CreateScanDto, ownerId: string): Promise<Scan> {
    const project = await this.projects.findOne({ where: { id: dto.project_id, ownerId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const scan = this.scans.create({
      project,
      status: 'pending',
      scanConfig: dto.scan_config ?? {},
      startedAt: new Date(),
    });
    return this.scans.save(scan);
  }

  async findAll(ownerId: string): Promise<Scan[]> {
    return this.scans
      .createQueryBuilder('scan')
      .leftJoin('scan.project', 'project')
      .where('project.owner_id = :ownerId', { ownerId })
      .orderBy('scan.created_at', 'DESC')
      .take(50)
      .getMany();
  }

  async findOne(id: string, ownerId: string): Promise<Scan | null> {
    return this.scans
      .createQueryBuilder('scan')
      .leftJoinAndSelect('scan.vulnerabilities', 'vulnerability')
      .leftJoin('scan.project', 'project')
      .where('scan.id = :id', { id })
      .andWhere('project.owner_id = :ownerId', { ownerId })
      .getOne();
  }

  async update(id: string, dto: UpdateScanDto, ownerId: string): Promise<Scan | null> {
    const scan = await this.scans
      .createQueryBuilder('scan')
      .leftJoin('scan.project', 'project')
      .where('scan.id = :id', { id })
      .andWhere('project.owner_id = :ownerId', { ownerId })
      .getOne();
    if (!scan) {
      return null;
    }
    if (dto.status) scan.status = dto.status;
    if (typeof dto.total_files === 'number') scan.totalFiles = dto.total_files;
    if (typeof dto.files_processed === 'number') scan.filesProcessed = dto.files_processed;
    if (typeof dto.duration_seconds === 'number') scan.durationSeconds = dto.duration_seconds;
    if (dto.status === 'completed') scan.completedAt = new Date();
    const saved = await this.scans.save(scan);
    if (dto.status === 'completed') {
      await this.events.emitComplete({ scan_id: id, summary: { total_files: saved.totalFiles } });
    }
    return saved;
  }

  async addFiles(scanId: string, files: CreateScanFileDto[], ownerId: string) {
    if (!files || files.length === 0) {
      return [];
    }
    const scan = await this.scans
      .createQueryBuilder('scan')
      .leftJoin('scan.project', 'project')
      .where('scan.id = :id', { id: scanId })
      .andWhere('project.owner_id = :ownerId', { ownerId })
      .getOne();
    if (!scan) {
      throw new NotFoundException('Scan not found');
    }
    const entities = files.map((file) =>
      this.scanFiles.create({
        scanId,
        filePath: file.file_path,
        language: file.language,
        linesOfCode: file.lines_of_code,
        vulnerabilityCount: file.vulnerability_count ?? 0,
      }),
    );
    const saved = await this.scanFiles.save(entities);
    await this.events.emitProgress({
      scan_id: scanId,
      files_processed: saved.length,
      total_files: saved.length,
    });
    return saved;
  }

  async addVulnerabilities(scanId: string, vulns: CreateVulnerabilityDto[], ownerId: string) {
    if (!vulns || vulns.length === 0) {
      return [];
    }
    const scan = await this.scans
      .createQueryBuilder('scan')
      .leftJoin('scan.project', 'project')
      .where('scan.id = :id', { id: scanId })
      .andWhere('project.owner_id = :ownerId', { ownerId })
      .getOne();
    if (!scan) {
      throw new NotFoundException('Scan not found');
    }
    const entities = vulns.map((v) =>
      this.vulnerabilities.create({
        scanId,
        type: v.type,
        severity: v.severity,
        filePath: v.file_path,
        lineNumber: v.line_number,
        columnNumber: v.column_number,
        codeSnippet: v.code_snippet,
        message: v.message,
        cweId: v.cwe_id,
        status: v.status ?? 'open',
      }),
    );
    const saved = await this.vulnerabilities.save(entities);
    for (const vuln of saved) {
      await this.events.emitVulnerability({ scan_id: scanId, vulnerability: vuln });
    }
    return saved;
  }

  async createTestScan(dto: CreateTestScanDto, ownerId: string) {
    const project = await this.projects.save(
      this.projects.create({ name: `test-project-${Date.now()}`, owner: { id: ownerId } as Project['owner'] }),
    );

    const totalFiles = dto.files ?? 10;
    const scan = await this.scans.save(
      this.scans.create({
        project,
        status: 'running',
        startedAt: new Date(),
        totalFiles,
        filesProcessed: 0,
        scanConfig: { test: true },
      }),
    );
    await this.events.emitProgress({
      scan_id: scan.id,
      files_processed: 0,
      total_files: totalFiles,
    });

    const files: ScanFile[] = [];
    for (let i = 0; i < totalFiles; i++) {
      files.push(
        this.scanFiles.create({
          scanId: scan.id,
          filePath: `src/test-file-${i + 1}.js`,
          language: 'javascript',
          linesOfCode: 50,
          vulnerabilityCount: 0,
        }),
      );
    }
    await this.scanFiles.save(files);
    await this.events.emitProgress({
      scan_id: scan.id,
      files_processed: totalFiles,
      total_files: totalFiles,
    });

    const vulnCount = dto.vulnerabilities ?? 3;
    const vulns: Vulnerability[] = [];
    for (let i = 0; i < vulnCount; i++) {
      vulns.push(
        this.vulnerabilities.create({
          scanId: scan.id,
          type: 'hardcoded_secret',
          severity: 'critical',
          filePath: `src/test-file-${i + 1}.js`,
          lineNumber: 10 + i,
          message: 'Hardcoded secret detected',
          status: 'open',
        }),
      );
    }
    const savedVulns = await this.vulnerabilities.save(vulns);
    for (const vuln of savedVulns) {
      await this.events.emitVulnerability({ scan_id: scan.id, vulnerability: vuln });
    }
    scan.status = 'completed';
    scan.completedAt = new Date();
    scan.filesProcessed = totalFiles;
    await this.scans.save(scan);
    await this.events.emitComplete({ scan_id: scan.id, summary: { total_files: totalFiles } });

    return scan;
  }
}
