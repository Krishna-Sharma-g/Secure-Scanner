"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const project_entity_1 = require("../entities/project.entity");
const project_member_entity_1 = require("../entities/project-member.entity");
const user_entity_1 = require("../entities/user.entity");
let ProjectsService = class ProjectsService {
    constructor(projects, members, users) {
        this.projects = projects;
        this.members = members;
        this.users = users;
    }
    async create(dto, ownerId) {
        const project = this.projects.create({
            name: dto.name,
            repositoryUrl: dto.repository_url,
            description: dto.description,
            owner: { id: ownerId },
        });
        const saved = await this.projects.save(project);
        await this.members.save(this.members.create({
            project: saved,
            user: { id: ownerId },
            role: project_member_entity_1.ProjectRole.OWNER,
        }));
        return saved;
    }
    async findAll(ownerId) {
        return this.projects
            .createQueryBuilder('project')
            .leftJoin('project_members', 'pm', 'pm.project_id = project.id')
            .where('pm.user_id = :ownerId', { ownerId })
            .orderBy('project.created_at', 'DESC')
            .getMany();
    }
    async findOne(id, ownerId) {
        return this.projects
            .createQueryBuilder('project')
            .leftJoin('project_members', 'pm', 'pm.project_id = project.id')
            .where('project.id = :id', { id })
            .andWhere('pm.user_id = :ownerId', { ownerId })
            .getOne();
    }
    async addMember(projectId, ownerId, dto) {
        const project = await this.findOne(projectId, ownerId);
        if (!project)
            return null;
        const user = await this.users.findOne({ where: { email: dto.email } });
        if (!user)
            return null;
        const existing = await this.members.findOne({ where: { projectId, userId: user.id } });
        if (existing)
            return existing;
        const member = this.members.create({
            project,
            user,
            role: dto.role ?? project_member_entity_1.ProjectRole.MEMBER,
        });
        return this.members.save(member);
    }
    async listMembers(projectId, ownerId) {
        const project = await this.findOne(projectId, ownerId);
        if (!project)
            return [];
        return this.members.find({ where: { projectId }, relations: ['user'] });
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(1, (0, typeorm_1.InjectRepository)(project_member_entity_1.ProjectMember)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProjectsService);
