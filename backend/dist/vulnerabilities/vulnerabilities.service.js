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
exports.VulnerabilitiesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const vulnerability_entity_1 = require("../entities/vulnerability.entity");
let VulnerabilitiesService = class VulnerabilitiesService {
    constructor(vulnerabilities) {
        this.vulnerabilities = vulnerabilities;
    }
    async findAll() {
        return this.vulnerabilities.find({
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }
    async findAllForUser(ownerId) {
        return this.vulnerabilities
            .createQueryBuilder('v')
            .leftJoin('v.scan', 'scan')
            .leftJoin('scan.project', 'project')
            .where('project.owner_id = :ownerId', { ownerId })
            .orderBy('v.created_at', 'DESC')
            .take(200)
            .getMany();
    }
    async findOneForUser(id, ownerId) {
        return this.vulnerabilities
            .createQueryBuilder('v')
            .leftJoin('v.scan', 'scan')
            .leftJoin('scan.project', 'project')
            .where('v.id = :id', { id })
            .andWhere('project.owner_id = :ownerId', { ownerId })
            .getOne();
    }
    async updateStatusForUser(id, dto, ownerId) {
        const vuln = await this.findOneForUser(id, ownerId);
        if (!vuln) {
            return null;
        }
        vuln.status = dto.status;
        vuln.remediationNotes = dto.notes ?? vuln.remediationNotes;
        if (dto.status === 'resolved') {
            vuln.resolvedAt = new Date();
        }
        return this.vulnerabilities.save(vuln);
    }
};
exports.VulnerabilitiesService = VulnerabilitiesService;
exports.VulnerabilitiesService = VulnerabilitiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(vulnerability_entity_1.Vulnerability)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], VulnerabilitiesService);
