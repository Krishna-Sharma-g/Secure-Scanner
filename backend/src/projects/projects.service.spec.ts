import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project } from '../entities/project.entity';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const mockProject: Partial<Project> = {
    id: 'uuid-1',
    name: 'test-project',
    repositoryUrl: 'https://github.com/test/repo',
    description: 'A test project',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepo = {
    create: jest.fn().mockReturnValue(mockProject),
    save: jest.fn().mockResolvedValue(mockProject),
    find: jest.fn().mockResolvedValue([mockProject]),
    findOne: jest.fn().mockResolvedValue(mockProject),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project with the given DTO', async () => {
      const dto = { name: 'test-project', repository_url: 'https://github.com/test/repo', description: 'A test project' };
      const result = await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: dto.name,
        repositoryUrl: dto.repository_url,
        description: dto.description,
      });
      expect(mockRepo.save).toHaveBeenCalledWith(mockProject);
      expect(result).toEqual(mockProject);
    });

    it('should handle optional fields', async () => {
      const dto = { name: 'minimal-project' };
      await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'minimal-project',
        repositoryUrl: undefined,
        description: undefined,
      });
    });
  });

  describe('findAll', () => {
    it('should return projects ordered by createdAt DESC', async () => {
      const result = await service.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
      expect(result).toEqual([mockProject]);
    });
  });

  describe('findOne', () => {
    it('should return a project by id', async () => {
      const result = await service.findOne('uuid-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(result).toEqual(mockProject);
    });

    it('should return null when project not found', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });
  });
});
