import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectMember, ProjectRole } from '../entities/project-member.entity';
import { User } from '../entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly members: Repository<ProjectMember>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async create(dto: CreateProjectDto, ownerId: string): Promise<Project> {
    const project = this.projects.create({
      name: dto.name,
      repositoryUrl: dto.repository_url,
      description: dto.description,
      owner: { id: ownerId } as Project['owner'],
    });
    const saved = await this.projects.save(project);
    await this.members.save(
      this.members.create({
        project: saved,
        user: { id: ownerId } as User,
        role: ProjectRole.OWNER,
      }),
    );
    return saved;
  }

  async findAll(ownerId: string): Promise<Project[]> {
    return this.projects
      .createQueryBuilder('project')
      .leftJoin('project_members', 'pm', 'pm.project_id = project.id')
      .where('pm.user_id = :ownerId', { ownerId })
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, ownerId: string): Promise<Project | null> {
    return this.projects
      .createQueryBuilder('project')
      .leftJoin('project_members', 'pm', 'pm.project_id = project.id')
      .where('project.id = :id', { id })
      .andWhere('pm.user_id = :ownerId', { ownerId })
      .getOne();
  }

  async addMember(projectId: string, ownerId: string, dto: AddProjectMemberDto) {
    const project = await this.findOne(projectId, ownerId);
    if (!project) return null;
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) return null;
    const existing = await this.members.findOne({ where: { projectId, userId: user.id } });
    if (existing) return existing;
    const member = this.members.create({
      project,
      user,
      role: dto.role ?? ProjectRole.MEMBER,
    });
    return this.members.save(member);
  }

  async listMembers(projectId: string, ownerId: string) {
    const project = await this.findOne(projectId, ownerId);
    if (!project) return [];
    return this.members.find({ where: { projectId }, relations: ['user'] });
  }
}
