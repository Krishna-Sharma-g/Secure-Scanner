import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { Project } from '../entities/project.entity';
import { ProjectMember, ProjectRole } from '../entities/project-member.entity';
import { User } from '../entities/user.entity';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const ownerId = 'user-1';

  const mockProject: Partial<Project> = {
    id: 'uuid-1',
    name: 'test-project',
    repositoryUrl: 'https://github.com/test/repo',
    description: 'A test project',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember: Partial<ProjectMember> = {
    id: 'member-1',
    projectId: 'uuid-1',
    userId: ownerId,
    role: ProjectRole.OWNER,
  };

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(mockProject),
    getMany: jest.fn().mockResolvedValue([mockProject]),
  };

  const projectRepo = {
    create: jest.fn().mockReturnValue(mockProject),
    save: jest.fn().mockResolvedValue(mockProject),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const memberRepo = {
    create: jest.fn().mockReturnValue(mockMember),
    save: jest.fn().mockResolvedValue(mockMember),
    find: jest.fn().mockResolvedValue([mockMember]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const userRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 'user-2', email: 'test@test.com' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(ProjectMember), useValue: memberRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
    projectRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.getOne.mockResolvedValue(mockProject);
    mockQueryBuilder.getMany.mockResolvedValue([mockProject]);
  });

  describe('create', () => {
    it('should create a project and add owner as member', async () => {
      const dto = { name: 'test-project', repository_url: 'https://github.com/test/repo', description: 'A test project' };
      const result = await service.create(dto, ownerId);

      expect(projectRepo.create).toHaveBeenCalledWith({
        name: dto.name,
        repositoryUrl: dto.repository_url,
        description: dto.description,
        owner: { id: ownerId },
      });
      expect(projectRepo.save).toHaveBeenCalled();
      expect(memberRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockProject);
    });

    it('should handle optional fields', async () => {
      const dto = { name: 'minimal-project' };
      await service.create(dto, ownerId);

      expect(projectRepo.create).toHaveBeenCalledWith({
        name: 'minimal-project',
        repositoryUrl: undefined,
        description: undefined,
        owner: { id: ownerId },
      });
    });
  });

  describe('findAll', () => {
    it('should return projects the user is a member of', async () => {
      const result = await service.findAll(ownerId);

      expect(projectRepo.createQueryBuilder).toHaveBeenCalledWith('project');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('pm.user_id = :ownerId', { ownerId });
      expect(result).toEqual([mockProject]);
    });
  });

  describe('findOne', () => {
    it('should return a project by id with ownership check', async () => {
      const result = await service.findOne('uuid-1', ownerId);

      expect(projectRepo.createQueryBuilder).toHaveBeenCalledWith('project');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('project.id = :id', { id: 'uuid-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('pm.user_id = :ownerId', { ownerId });
      expect(result).toEqual(mockProject);
    });

    it('should return null when project not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      const result = await service.findOne('non-existent', ownerId);

      expect(result).toBeNull();
    });
  });

  describe('addMember', () => {
    it('should add a member to a project', async () => {
      const dto = { email: 'test@test.com' };
      const result = await service.addMember('uuid-1', ownerId, dto);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { email: 'test@test.com' } });
      expect(memberRepo.save).toHaveBeenCalled();
      expect(result).toEqual(mockMember);
    });

    it('should return null when project not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      const result = await service.addMember('missing', ownerId, { email: 'test@test.com' });

      expect(result).toBeNull();
    });

    it('should return null when user email not found', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.addMember('uuid-1', ownerId, { email: 'nobody@test.com' });

      expect(result).toBeNull();
    });
  });

  describe('listMembers', () => {
    it('should list members of a project', async () => {
      const result = await service.listMembers('uuid-1', ownerId);

      expect(memberRepo.find).toHaveBeenCalledWith({ where: { projectId: 'uuid-1' }, relations: ['user'] });
      expect(result).toEqual([mockMember]);
    });

    it('should return empty array when project not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      const result = await service.listMembers('missing', ownerId);

      expect(result).toEqual([]);
    });
  });
});
