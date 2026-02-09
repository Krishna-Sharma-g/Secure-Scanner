import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VulnerabilitiesService } from './vulnerabilities.service';
import { Vulnerability } from '../entities/vulnerability.entity';

describe('VulnerabilitiesService', () => {
  let service: VulnerabilitiesService;

  const ownerId = 'user-1';

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

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  };

  const mockRepo = {
    find: jest.fn().mockResolvedValue([mockVuln]),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
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
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.getOne.mockImplementation(() => Promise.resolve({ ...mockVuln }));
    mockQueryBuilder.getMany.mockResolvedValue([mockVuln]);
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

  describe('findAllForUser', () => {
    it('should return vulnerabilities for user projects', async () => {
      const result = await service.findAllForUser(ownerId);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('v');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('pm.user_id = :ownerId', { ownerId });
      expect(result).toEqual([mockVuln]);
    });

    it('should filter by projectId when provided', async () => {
      await service.findAllForUser(ownerId, 'proj-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('project.id = :projectId', { projectId: 'proj-1' });
    });
  });

  describe('findOneForUser', () => {
    it('should return a vulnerability by id with ownership check', async () => {
      const result = await service.findOneForUser('vuln-1', ownerId);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('v.id = :id', { id: 'vuln-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('pm.user_id = :ownerId', { ownerId });
      expect(result).toBeTruthy();
    });

    it('should return null when not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      const result = await service.findOneForUser('missing', ownerId);

      expect(result).toBeNull();
    });
  });

  describe('updateStatusForUser', () => {
    it('should update status to resolved with timestamp', async () => {
      const result = await service.updateStatusForUser('vuln-1', {
        status: 'resolved',
        notes: 'Fixed by sanitizing input',
      }, ownerId);

      expect(result).toBeTruthy();
      expect(result!.status).toBe('resolved');
      expect(result!.resolvedAt).toBeInstanceOf(Date);
      expect(result!.remediationNotes).toBe('Fixed by sanitizing input');
    });

    it('should update status to ignored without resolvedAt', async () => {
      const result = await service.updateStatusForUser('vuln-1', {
        status: 'ignored',
      }, ownerId);

      expect(result!.status).toBe('ignored');
      expect(result!.resolvedAt).toBeUndefined();
    });

    it('should update status to false_positive', async () => {
      const result = await service.updateStatusForUser('vuln-1', {
        status: 'false_positive',
        notes: 'Not a real vulnerability',
      }, ownerId);

      expect(result!.status).toBe('false_positive');
    });

    it('should return null when vulnerability not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      const result = await service.updateStatusForUser('missing', { status: 'resolved' }, ownerId);

      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });
});
