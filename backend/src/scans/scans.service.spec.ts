import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScansService } from './scans.service';
import { ScanEventsService } from './scan-events.service';
import { Scan } from '../entities/scan.entity';
import { ScanFile } from '../entities/scan-file.entity';
import { Vulnerability } from '../entities/vulnerability.entity';
import { Project } from '../entities/project.entity';

describe('ScansService', () => {
  let service: ScansService;

  const mockScan: Partial<Scan> = {
    id: 'scan-1',
    status: 'pending',
    totalFiles: 0,
    filesProcessed: 0,
    startedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockScanFile: Partial<ScanFile> = {
    id: 'file-1',
    scanId: 'scan-1',
    filePath: 'src/app.js',
    language: 'javascript',
    linesOfCode: 100,
    vulnerabilityCount: 2,
  };

  const mockVuln: Partial<Vulnerability> = {
    id: 'vuln-1',
    scanId: 'scan-1',
    type: 'xss_dom',
    severity: 'high',
    filePath: 'src/app.js',
    lineNumber: 42,
    message: 'XSS detected',
    status: 'open',
  };

  const scanRepo = {
    create: jest.fn().mockReturnValue(mockScan),
    save: jest.fn().mockResolvedValue(mockScan),
    find: jest.fn().mockResolvedValue([mockScan]),
    findOne: jest.fn().mockResolvedValue({ ...mockScan }),
  };

  const scanFileRepo = {
    create: jest.fn().mockReturnValue(mockScanFile),
    save: jest.fn().mockResolvedValue([mockScanFile]),
  };

  const vulnRepo = {
    create: jest.fn().mockReturnValue(mockVuln),
    save: jest.fn().mockResolvedValue([mockVuln]),
  };

  const projectRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEventsService = {
    emitProgress: jest.fn().mockResolvedValue(undefined),
    emitVulnerability: jest.fn().mockResolvedValue(undefined),
    emitComplete: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScansService,
        { provide: getRepositoryToken(Scan), useValue: scanRepo },
        { provide: getRepositoryToken(ScanFile), useValue: scanFileRepo },
        { provide: getRepositoryToken(Vulnerability), useValue: vulnRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: ScanEventsService, useValue: mockEventsService },
      ],
    }).compile();

    service = module.get<ScansService>(ScansService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a scan with pending status', async () => {
      const dto = { project_id: 'proj-1' };
      await service.create(dto);

      expect(scanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          startedAt: expect.any(Date),
        }),
      );
      expect(scanRepo.save).toHaveBeenCalled();
    });

    it('should pass scan_config from DTO', async () => {
      const dto = { project_id: 'proj-1', scan_config: { languages: ['javascript'] } };
      await service.create(dto);

      expect(scanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scanConfig: { languages: ['javascript'] },
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return the last 50 scans', async () => {
      const result = await service.findAll();

      expect(scanRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 50,
      });
      expect(result).toEqual([mockScan]);
    });
  });

  describe('findOne', () => {
    it('should return scan with vulnerabilities relation', async () => {
      await service.findOne('scan-1');

      expect(scanRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'scan-1' },
        relations: ['vulnerabilities'],
      });
    });
  });

  describe('update', () => {
    it('should update scan status and metrics', async () => {
      const dto = { status: 'running', total_files: 10, files_processed: 5 };
      await service.update('scan-1', dto);

      expect(scanRepo.save).toHaveBeenCalled();
    });

    it('should emit complete event when status is completed', async () => {
      const dto = { status: 'completed', duration_seconds: 30 };
      await service.update('scan-1', dto);

      expect(mockEventsService.emitComplete).toHaveBeenCalledWith(
        expect.objectContaining({ scan_id: 'scan-1' }),
      );
    });

    it('should not emit complete event for non-completed status', async () => {
      await service.update('scan-1', { status: 'running' });

      expect(mockEventsService.emitComplete).not.toHaveBeenCalled();
    });

    it('should return null when scan not found', async () => {
      scanRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.update('missing', { status: 'running' });

      expect(result).toBeNull();
    });
  });

  describe('addFiles', () => {
    it('should create scan files and emit progress', async () => {
      const files = [
        { file_path: 'src/app.js', language: 'javascript', lines_of_code: 100, vulnerability_count: 2 },
      ];
      await service.addFiles('scan-1', files);

      expect(scanFileRepo.create).toHaveBeenCalled();
      expect(scanFileRepo.save).toHaveBeenCalled();
      expect(mockEventsService.emitProgress).toHaveBeenCalled();
    });

    it('should return empty array for empty files', async () => {
      const result = await service.addFiles('scan-1', []);
      expect(result).toEqual([]);
      expect(scanFileRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('addVulnerabilities', () => {
    it('should create vulnerabilities and emit events', async () => {
      const vulns = [
        { type: 'xss_dom', severity: 'high', file_path: 'src/app.js', line_number: 42, message: 'XSS' },
      ];
      await service.addVulnerabilities('scan-1', vulns);

      expect(vulnRepo.create).toHaveBeenCalled();
      expect(vulnRepo.save).toHaveBeenCalled();
      expect(mockEventsService.emitVulnerability).toHaveBeenCalled();
    });

    it('should return empty array for empty vulnerabilities', async () => {
      const result = await service.addVulnerabilities('scan-1', []);
      expect(result).toEqual([]);
      expect(vulnRepo.save).not.toHaveBeenCalled();
    });
  });
});
