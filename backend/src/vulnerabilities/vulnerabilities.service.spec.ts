import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { Vulnerability } from '../entities/vulnerability.entity';

describe('VulnerabilitiesService', () => {
  let service: VulnerabilitiesService;

  const mockVuln: Partial<Vulnerability> = {
    id: 'vuln-1',
    type: 'xss_dom',
    severity: 'high',
    filePath: 'src/app.js',
    lineNumber: 42,
    message: 'DOM XSS detected',
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepo = {
    find: jest.fn().mockResolvedValue([mockVuln]),
    findOne: jest.fn().mockImplementation(() => Promise.resolve({ ...mockVuln })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VulnerabilitiesService,
        { provide: getRepositoryToken(Vulnerability), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<VulnerabilitiesService>(VulnerabilitiesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return the last 100 vulnerabilities', async () => {
      const result = await service.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 100,
      });
      expect(result).toEqual([mockVuln]);
    });
  });

  describe('findOne', () => {
    it('should return a vulnerability by id', async () => {
      const result = await service.findOne('vuln-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'vuln-1' } });
      expect(result).toBeTruthy();
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.findOne('missing');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update status to resolved with timestamp', async () => {
      const result = await service.updateStatus('vuln-1', {
        status: 'resolved',
        notes: 'Fixed by sanitizing input',
      });

      expect(result).toBeTruthy();
      expect(result!.status).toBe('resolved');
      expect(result!.resolvedAt).toBeInstanceOf(Date);
      expect(result!.remediationNotes).toBe('Fixed by sanitizing input');
    });

    it('should update status to ignored without resolvedAt', async () => {
      const result = await service.updateStatus('vuln-1', {
        status: 'ignored',
      });

      expect(result!.status).toBe('ignored');
      expect(result!.resolvedAt).toBeUndefined();
    });

    it('should update status to false_positive', async () => {
      const result = await service.updateStatus('vuln-1', {
        status: 'false_positive',
        notes: 'Not a real vulnerability',
      });

      expect(result!.status).toBe('false_positive');
    });

    it('should return null when vulnerability not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.updateStatus('missing', { status: 'resolved' });

      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });
});
